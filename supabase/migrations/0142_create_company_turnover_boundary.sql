-- T-DB2 — minimum durable company-total Turnover boundary.
--
-- Coverage begins when a company is first observed after this migration. No
-- historical row is inferred or backfilled. A monthly accumulator is maintained
-- transactionally from People row transitions; activity_events remains an audit
-- correlation source, not the historical source of truth.

create table public.company_turnover_monthly_facts (
  company_id uuid not null references public.companies(id) on delete cascade,
  period_start date not null,
  period_end_exclusive date not null,
  coverage_started_at timestamptz not null,
  headcount_at_start integer,
  headcount_current integer not null,
  headcount_at_end integer,
  canonical_terminations integer not null default 0,
  last_observed_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, period_start),
  constraint company_turnover_period_bounds_check check (
    period_start = date_trunc('month', period_start::timestamp)::date
    and period_end_exclusive = (period_start + interval '1 month')::date
  ),
  constraint company_turnover_counts_check check (
    headcount_at_start is null or headcount_at_start >= 0
  ),
  constraint company_turnover_current_count_check check (headcount_current >= 0),
  constraint company_turnover_end_count_check check (
    headcount_at_end is null or headcount_at_end >= 0
  ),
  constraint company_turnover_terminations_check check (canonical_terminations >= 0),
  constraint company_turnover_closed_shape_check check (
    (closed_at is null and headcount_at_end is null)
    or (closed_at is not null and headcount_at_end is not null)
  )
);

comment on table public.company_turnover_monthly_facts is
  'Purpose-bound company-total monthly Turnover accumulator. Contains counts and coverage only; never person identity or separation cause.';

alter table public.company_turnover_monthly_facts enable row level security;

revoke all on table public.company_turnover_monthly_facts
from public, anon, authenticated, service_role;

create function public.ensure_company_turnover_period_v1(
  p_company_id uuid,
  p_observed_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_observed_at timestamptz := coalesce(p_observed_at, transaction_timestamp());
  v_current_start date := date_trunc('month', v_observed_at at time zone 'UTC')::date;
  v_latest public.company_turnover_monthly_facts%rowtype;
  v_next_start date;
  v_initial_headcount integer;
begin
  if p_company_id is null then
    raise exception using errcode = '22023', message = 'TURNOVER_COMPANY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('turnover:' || p_company_id::text, 0));

  select * into v_latest
  from public.company_turnover_monthly_facts fact
  where fact.company_id = p_company_id
  order by fact.period_start desc
  limit 1
  for update;

  if not found then
    select count(*)::integer into v_initial_headcount
    from public.people person
    where person.company_id = p_company_id
      and person.status in ('active', 'on_leave');

    insert into public.company_turnover_monthly_facts (
      company_id, period_start, period_end_exclusive, coverage_started_at,
      headcount_at_start, headcount_current, canonical_terminations,
      last_observed_at
    ) values (
      p_company_id, v_current_start, (v_current_start + interval '1 month')::date,
      v_observed_at, null, v_initial_headcount, 0, v_observed_at
    );
    return;
  end if;

  while v_latest.period_start < v_current_start loop
    update public.company_turnover_monthly_facts
    set headcount_at_end = v_latest.headcount_current,
        closed_at = v_latest.period_end_exclusive::timestamp at time zone 'UTC',
        last_observed_at = greatest(
          v_latest.last_observed_at,
          v_latest.period_end_exclusive::timestamp at time zone 'UTC'
        ),
        updated_at = transaction_timestamp()
    where company_id = v_latest.company_id
      and period_start = v_latest.period_start;

    v_next_start := v_latest.period_end_exclusive;
    insert into public.company_turnover_monthly_facts (
      company_id, period_start, period_end_exclusive, coverage_started_at,
      headcount_at_start, headcount_current, canonical_terminations,
      last_observed_at
    ) values (
      p_company_id, v_next_start, (v_next_start + interval '1 month')::date,
      v_latest.coverage_started_at, v_latest.headcount_current,
      v_latest.headcount_current, 0,
      greatest(v_latest.last_observed_at, v_next_start::timestamp at time zone 'UTC')
    )
    on conflict (company_id, period_start) do nothing;

    select * into strict v_latest
    from public.company_turnover_monthly_facts fact
    where fact.company_id = p_company_id
      and fact.period_start = v_next_start
    for update;
  end loop;

  update public.company_turnover_monthly_facts
  set last_observed_at = greatest(last_observed_at, v_observed_at),
      updated_at = transaction_timestamp()
  where company_id = p_company_id
    and period_start = v_current_start;
end;
$$;

revoke all on function public.ensure_company_turnover_period_v1(uuid, timestamptz)
from public, anon, authenticated, service_role;

create function public.capture_company_turnover_people_delta_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_observed_at timestamptz := transaction_timestamp();
  v_period_start date := date_trunc('month', v_observed_at at time zone 'UTC')::date;
  v_old_in_headcount boolean := false;
  v_new_in_headcount boolean := false;
  v_headcount_delta integer;
  v_termination_delta integer := 0;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.ensure_company_turnover_period_v1(old.company_id, v_observed_at);
    v_old_in_headcount := old.status in ('active', 'on_leave');
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    if tg_op = 'INSERT' or new.company_id <> old.company_id then
      perform public.ensure_company_turnover_period_v1(new.company_id, v_observed_at);
    end if;
    v_new_in_headcount := new.status in ('active', 'on_leave');
  end if;

  if tg_op = 'UPDATE' and old.company_id <> new.company_id then
    update public.company_turnover_monthly_facts
    set headcount_current = headcount_current - case when v_old_in_headcount then 1 else 0 end,
        last_observed_at = v_observed_at,
        updated_at = v_observed_at
    where company_id = old.company_id and period_start = v_period_start;

    update public.company_turnover_monthly_facts
    set headcount_current = headcount_current + case when v_new_in_headcount then 1 else 0 end,
        last_observed_at = v_observed_at,
        updated_at = v_observed_at
    where company_id = new.company_id and period_start = v_period_start;
    return new;
  end if;

  v_headcount_delta :=
    (case when v_new_in_headcount then 1 else 0 end)
    - (case when v_old_in_headcount then 1 else 0 end);

  if tg_op = 'UPDATE'
     and old.status <> 'terminated'
     and new.status = 'terminated'
  then
    v_termination_delta := 1;
  end if;

  update public.company_turnover_monthly_facts
  set headcount_current = headcount_current + v_headcount_delta,
      canonical_terminations = canonical_terminations + v_termination_delta,
      last_observed_at = v_observed_at,
      updated_at = v_observed_at
  where company_id = coalesce(new.company_id, old.company_id)
    and period_start = v_period_start;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.capture_company_turnover_people_delta_v1()
from public, anon, authenticated, service_role;

create trigger capture_company_turnover_people_delta_v1
before insert or update or delete on public.people
for each row execute function public.capture_company_turnover_people_delta_v1();

create function public.get_company_turnover_v1(
  p_company_id uuid,
  p_reason text
)
returns table (
  period_kind text,
  period_start date,
  period_end_exclusive date,
  availability text,
  unavailable_reason text,
  headcount_at_start integer,
  headcount_at_end integer,
  headcount_as_of integer,
  canonical_terminations integer,
  turnover_percent numeric,
  coverage_started_at timestamptz,
  headcount_as_of_at timestamptz,
  generated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_generated_at timestamptz := statement_timestamp();
  v_current_start date := date_trunc('month', v_generated_at at time zone 'UTC')::date;
begin
  if p_company_id is null then
    raise exception using errcode = '22023', message = 'TURNOVER_COMPANY_REQUIRED';
  end if;

  perform public.audit_secure_administrative_read(
    p_company_id, 'turnover', 'turnover_company_summary', p_company_id,
    'read_company_turnover', p_reason
  );
  perform public.ensure_company_turnover_period_v1(p_company_id, v_generated_at);

  return query
  with requested(kind, start_at) as (
    values
      ('closed'::text, (v_current_start - interval '1 month')::date),
      ('mtd'::text, v_current_start)
  ), resolved as (
    select requested.kind, requested.start_at, fact.*,
      case
        when fact.company_id is null then false
        when requested.kind = 'closed' then
          fact.coverage_started_at <= fact.period_start::timestamp at time zone 'UTC'
          and fact.closed_at is not null and fact.headcount_at_end is not null
        else
          fact.coverage_started_at <= fact.period_start::timestamp at time zone 'UTC'
          and fact.headcount_at_start is not null
      end as is_available
    from requested
    left join public.company_turnover_monthly_facts fact
      on fact.company_id = p_company_id and fact.period_start = requested.start_at
  )
  select
    resolved.kind,
    resolved.start_at,
    (resolved.start_at + interval '1 month')::date,
    case when resolved.is_available then 'available' else 'unavailable' end,
    case when resolved.is_available then null::text else 'incomplete_coverage' end,
    case when resolved.is_available then resolved.headcount_at_start else null end,
    case when resolved.is_available and resolved.kind = 'closed'
      then resolved.headcount_at_end else null end,
    case when resolved.is_available and resolved.kind = 'mtd'
      then resolved.headcount_current else null end,
    case when resolved.is_available then resolved.canonical_terminations else null end,
    case
      when not resolved.is_available then null
      when ((resolved.headcount_at_start + case when resolved.kind = 'closed'
        then resolved.headcount_at_end else resolved.headcount_current end)::numeric / 2) <= 0
        then null
      else resolved.canonical_terminations::numeric * 100
        / ((resolved.headcount_at_start + case when resolved.kind = 'closed'
          then resolved.headcount_at_end else resolved.headcount_current end)::numeric / 2)
    end,
    resolved.coverage_started_at,
    case when resolved.is_available and resolved.kind = 'mtd'
      then resolved.last_observed_at else null end,
    v_generated_at
  from resolved
  order by resolved.start_at;
end;
$$;

revoke all on function public.get_company_turnover_v1(uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.get_company_turnover_v1(uuid, text)
to authenticated;

comment on function public.get_company_turnover_v1(uuid, text) is
  'Purpose-bound company-total Turnover for the closed previous UTC month and current UTC MTD. Aggregate-only; incomplete coverage is unavailable.';

notify pgrst, 'reload schema';
