-- PR-110 — KPI Operational Adapters persistent stores

create table public.kpi_operational_deduplication (
  trigger_hash text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  provider_key text,
  reason text not null,
  window_started_at timestamptz not null,
  window_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint kpi_operational_deduplication_window_check check (window_expires_at > window_started_at),
  constraint kpi_operational_deduplication_text_check check (
    char_length(btrim(trigger_hash)) > 0 and char_length(btrim(reason)) > 0)
);

create unique index kpi_operational_deduplication_scope_uidx
on public.kpi_operational_deduplication
  (company_id, coalesce(provider_key, ''), trigger_hash, reason, window_started_at);
create index kpi_operational_deduplication_expiry_idx
on public.kpi_operational_deduplication(company_id, window_expires_at);

create table public.kpi_operational_rate_limit (
  company_id uuid not null references public.companies(id) on delete cascade,
  provider_key text,
  window_started_at timestamptz not null,
  window_expires_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kpi_operational_rate_limit_window_check check (window_expires_at > window_started_at)
);

create unique index kpi_operational_rate_limit_scope_uidx
on public.kpi_operational_rate_limit(company_id, coalesce(provider_key, ''), window_started_at);
create index kpi_operational_rate_limit_expiry_idx
on public.kpi_operational_rate_limit(company_id, window_expires_at);

alter table public.kpi_operational_deduplication enable row level security;
alter table public.kpi_operational_rate_limit enable row level security;

create policy "admins and hr manage kpi operational deduplication"
on public.kpi_operational_deduplication for all
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));
create policy "admins and hr manage kpi operational rate limit"
on public.kpi_operational_rate_limit for all
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));

create function public.reserve_kpi_operational_deduplication(
  p_trigger_hash text, p_company_id uuid, p_provider_key text, p_reason text,
  p_window_started_at timestamptz, p_window_expires_at timestamptz
) returns boolean language plpgsql security invoker set search_path = public as $$
begin
  if exists (select 1 from public.kpi_operational_deduplication where company_id = p_company_id
    and provider_key is not distinct from p_provider_key and trigger_hash = p_trigger_hash
    and reason = p_reason and window_expires_at > p_window_started_at) then return false; end if;
  insert into public.kpi_operational_deduplication(trigger_hash, company_id, provider_key, reason,
    window_started_at, window_expires_at) values (p_trigger_hash, p_company_id, p_provider_key,
    p_reason, p_window_started_at, p_window_expires_at);
  return true;
exception when unique_violation then return false;
end;
$$;

create function public.consume_kpi_operational_rate_limit(
  p_company_id uuid, p_provider_key text, p_window_started_at timestamptz,
  p_window_expires_at timestamptz, p_limit integer
) returns boolean language plpgsql security invoker set search_path = public as $$
declare v_count integer;
begin
  if p_limit < 1 then return false; end if;
  insert into public.kpi_operational_rate_limit(company_id, provider_key, window_started_at,
    window_expires_at, request_count) values (p_company_id, p_provider_key, p_window_started_at,
    p_window_expires_at, 1)
  on conflict (company_id, (coalesce(provider_key, '')), window_started_at)
  do update set request_count = public.kpi_operational_rate_limit.request_count + 1,
    updated_at = p_window_started_at
  where public.kpi_operational_rate_limit.request_count < p_limit
  returning request_count into v_count;
  return v_count is not null and v_count <= p_limit;
end;
$$;

create function public.acquire_kpi_operational_lease(
  p_company_id uuid, p_provider_key text, p_owner_id text, p_lease_id text,
  p_acquired_at timestamptz, p_expires_at timestamptz, p_limit integer
) returns boolean language plpgsql security invoker set search_path = public as $$
begin
  if exists (select 1 from public.kpi_operational_deduplication where company_id = p_company_id
    and trigger_hash = '__cancelled__' and window_expires_at > p_acquired_at) then return false; end if;
  if (select count(*) from public.kpi_operational_deduplication where company_id = p_company_id
    and provider_key is not distinct from p_provider_key
    and reason like 'coordination:%' and window_expires_at > p_acquired_at) >= p_limit then return false; end if;
  insert into public.kpi_operational_deduplication(trigger_hash, company_id, provider_key, reason,
    window_started_at, window_expires_at) values (p_lease_id, p_company_id, p_provider_key,
    'coordination:' || p_owner_id, p_acquired_at, p_expires_at);
  return true;
exception when unique_violation then return false;
end;
$$;

create function public.release_kpi_operational_lease(p_company_id uuid, p_lease_id text)
returns void language sql security invoker set search_path = public as $$
  delete from public.kpi_operational_deduplication
  where company_id = p_company_id and trigger_hash = p_lease_id and reason like 'coordination:%';
$$;
create function public.cancel_kpi_operational_company(p_company_id uuid)
returns void language sql security invoker set search_path = public as $$
  insert into public.kpi_operational_deduplication(trigger_hash, company_id, reason,
    window_started_at, window_expires_at)
  values ('__cancelled__', p_company_id, 'coordination:cancelled', statement_timestamp(), 'infinity');
$$;
create function public.is_kpi_operational_company_cancelled(p_company_id uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select exists(select 1 from public.kpi_operational_deduplication
    where company_id = p_company_id and trigger_hash = '__cancelled__'
      and window_expires_at > statement_timestamp());
$$;
create function public.get_kpi_operational_coordinator_state()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'active', count(*) filter (where reason like 'coordination:%'
      and trigger_hash <> '__cancelled__' and window_expires_at > statement_timestamp()),
    'cancelledCompanies', coalesce(jsonb_agg(distinct company_id::text)
      filter (where trigger_hash = '__cancelled__' and window_expires_at > statement_timestamp()), '[]'::jsonb)
  ) from public.kpi_operational_deduplication;
$$;

revoke all on function public.reserve_kpi_operational_deduplication(text, uuid, text, text, timestamptz, timestamptz) from public;
revoke all on function public.consume_kpi_operational_rate_limit(uuid, text, timestamptz, timestamptz, integer) from public;
revoke all on function public.acquire_kpi_operational_lease(uuid, text, text, text, timestamptz, timestamptz, integer) from public;
revoke all on function public.release_kpi_operational_lease(uuid, text) from public;
revoke all on function public.cancel_kpi_operational_company(uuid) from public;
revoke all on function public.is_kpi_operational_company_cancelled(uuid) from public;
revoke all on function public.get_kpi_operational_coordinator_state() from public;
grant execute on function public.reserve_kpi_operational_deduplication(text, uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.consume_kpi_operational_rate_limit(uuid, text, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.acquire_kpi_operational_lease(uuid, text, text, text, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.release_kpi_operational_lease(uuid, text) to authenticated;
grant execute on function public.cancel_kpi_operational_company(uuid) to authenticated;
grant execute on function public.is_kpi_operational_company_cancelled(uuid) to authenticated;
grant execute on function public.get_kpi_operational_coordinator_state() to authenticated;
