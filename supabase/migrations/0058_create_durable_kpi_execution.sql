-- PR-106 — Durable KPI Execution

create table public.kpi_executions (
  id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  provider_key text not null,
  idempotency_key text not null,
  correlation_id text not null,
  execution_type text not null,
  status text not null,
  requested_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  interrupted_at timestamptz,
  request_snapshot jsonb not null,
  result_snapshot jsonb,
  error_snapshot jsonb,
  attempt_count integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (company_id, id),
  constraint kpi_executions_id_company_unique unique (id, company_id),
  constraint kpi_executions_idempotency_unique unique (company_id, provider_key, idempotency_key),
  constraint kpi_executions_type_check check (execution_type in ('single', 'batch')),
  constraint kpi_executions_status_check check (status in ('pending', 'running', 'succeeded', 'partially_succeeded', 'failed', 'interrupted')),
  constraint kpi_executions_attempt_count_check check (attempt_count >= 0),
  constraint kpi_executions_request_check check (jsonb_typeof(request_snapshot) = 'object'),
  constraint kpi_executions_result_check check (result_snapshot is null or jsonb_typeof(result_snapshot) = 'object'),
  constraint kpi_executions_error_check check (error_snapshot is null or jsonb_typeof(error_snapshot) = 'object')
);

create table public.kpi_execution_attempts (
  id text not null,
  execution_id text not null,
  company_id uuid not null,
  attempt_number integer not null,
  status text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  failed_at timestamptz,
  error_snapshot jsonb,
  created_at timestamptz not null,
  primary key (company_id, id),
  constraint kpi_execution_attempts_execution_fk foreign key (execution_id, company_id)
    references public.kpi_executions(id, company_id) on delete cascade,
  constraint kpi_execution_attempts_number_unique unique (execution_id, attempt_number),
  constraint kpi_execution_attempts_number_check check (attempt_number > 0),
  constraint kpi_execution_attempts_status_check check (status in ('running', 'succeeded', 'failed', 'interrupted')),
  constraint kpi_execution_attempts_error_check check (error_snapshot is null or jsonb_typeof(error_snapshot) = 'object')
);

create index kpi_executions_company_created_idx on public.kpi_executions(company_id, created_at desc, id);
create index kpi_executions_provider_created_idx on public.kpi_executions(company_id, provider_key, created_at desc, id);
create index kpi_executions_status_created_idx on public.kpi_executions(company_id, status, created_at desc, id);
create index kpi_executions_correlation_idx on public.kpi_executions(company_id, correlation_id);
create index kpi_executions_running_idx on public.kpi_executions(company_id, provider_key, updated_at) where status = 'running';
create index kpi_executions_idempotency_idx on public.kpi_executions(company_id, provider_key, idempotency_key);
create index kpi_execution_attempts_execution_number_idx on public.kpi_execution_attempts(execution_id, attempt_number);

create or replace function public.reserve_kpi_execution(p_execution jsonb)
returns table(reserved boolean, execution_id text)
language plpgsql security invoker set search_path = public
as $$
begin
  insert into public.kpi_executions (
    id, company_id, provider_key, idempotency_key, correlation_id, execution_type,
    status, requested_at, request_snapshot, attempt_count, created_at, updated_at
  ) values (
    p_execution->>'id', (p_execution->>'companyId')::uuid,
    p_execution->>'providerKey', p_execution->>'idempotencyKey',
    p_execution->>'correlationId', p_execution->>'executionType', 'pending',
    (p_execution->>'requestedAt')::timestamptz, p_execution->'requestSnapshot', 0,
    (p_execution->>'createdAt')::timestamptz, (p_execution->>'updatedAt')::timestamptz
  ) on conflict (company_id, provider_key, idempotency_key) do nothing;
  if found then return query select true, p_execution->>'id';
  else return query select false, e.id from public.kpi_executions e
    where e.company_id = (p_execution->>'companyId')::uuid
      and e.provider_key = p_execution->>'providerKey'
      and e.idempotency_key = p_execution->>'idempotencyKey';
  end if;
end;
$$;

create or replace function public.start_kpi_execution_attempt(
  p_company_id uuid, p_execution_id text, p_attempt_id text, p_started_at timestamptz
) returns integer language plpgsql security invoker set search_path = public as $$
declare v_attempt integer;
begin
  update public.kpi_executions set status = 'running', started_at = p_started_at,
    failed_at = null, interrupted_at = null, attempt_count = attempt_count + 1,
    updated_at = p_started_at
  where company_id = p_company_id and id = p_execution_id
    and status in ('pending', 'failed')
  returning attempt_count into v_attempt;
  if v_attempt is null then raise exception 'KPI_EXECUTION_NOT_ACQUIRABLE'; end if;
  insert into public.kpi_execution_attempts(id, execution_id, company_id, attempt_number,
    status, started_at, created_at) values
    (p_attempt_id, p_execution_id, p_company_id, v_attempt, 'running', p_started_at, p_started_at);
  return v_attempt;
end;
$$;

create or replace function public.complete_kpi_execution(
  p_company_id uuid, p_execution_id text, p_attempt_id text, p_status text,
  p_result jsonb, p_completed_at timestamptz
) returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_status not in ('succeeded', 'partially_succeeded') then raise exception 'KPI_EXECUTION_INVALID_SUCCESS_STATUS'; end if;
  update public.kpi_executions set status = p_status, result_snapshot = p_result,
    completed_at = p_completed_at, updated_at = p_completed_at
  where company_id = p_company_id and id = p_execution_id and status = 'running';
  if not found then raise exception 'KPI_EXECUTION_INVALID_TRANSITION'; end if;
  update public.kpi_execution_attempts set status = 'succeeded', completed_at = p_completed_at
  where company_id = p_company_id and id = p_attempt_id and status = 'running';
end;
$$;

create or replace function public.fail_kpi_execution(
  p_company_id uuid, p_execution_id text, p_attempt_id text,
  p_error jsonb, p_failed_at timestamptz
) returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.kpi_executions set status = 'failed', error_snapshot = p_error,
    failed_at = p_failed_at, updated_at = p_failed_at
  where company_id = p_company_id and id = p_execution_id and status = 'running';
  if not found then raise exception 'KPI_EXECUTION_INVALID_TRANSITION'; end if;
  update public.kpi_execution_attempts set status = 'failed', failed_at = p_failed_at,
    error_snapshot = p_error where company_id = p_company_id and id = p_attempt_id and status = 'running';
end;
$$;

create or replace function public.interrupt_kpi_execution(
  p_company_id uuid, p_execution_id text, p_attempt_id text, p_interrupted_at timestamptz
) returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.kpi_executions set status = 'interrupted', interrupted_at = p_interrupted_at,
    updated_at = p_interrupted_at where company_id = p_company_id and id = p_execution_id
    and status in ('pending', 'running', 'failed');
  if not found then raise exception 'KPI_EXECUTION_INVALID_TRANSITION'; end if;
  update public.kpi_execution_attempts set status = 'interrupted'
    where company_id = p_company_id and id = p_attempt_id and status = 'running';
end;
$$;

revoke all on function public.reserve_kpi_execution(jsonb) from public;
revoke all on function public.start_kpi_execution_attempt(uuid, text, text, timestamptz) from public;
revoke all on function public.complete_kpi_execution(uuid, text, text, text, jsonb, timestamptz) from public;
revoke all on function public.fail_kpi_execution(uuid, text, text, jsonb, timestamptz) from public;
revoke all on function public.interrupt_kpi_execution(uuid, text, text, timestamptz) from public;
grant execute on function public.reserve_kpi_execution(jsonb) to authenticated;
grant execute on function public.start_kpi_execution_attempt(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.complete_kpi_execution(uuid, text, text, text, jsonb, timestamptz) to authenticated;
grant execute on function public.fail_kpi_execution(uuid, text, text, jsonb, timestamptz) to authenticated;
grant execute on function public.interrupt_kpi_execution(uuid, text, text, timestamptz) to authenticated;

alter table public.kpi_executions enable row level security;
alter table public.kpi_execution_attempts enable row level security;
create policy "members read kpi executions" on public.kpi_executions for select
using (public.is_company_member(company_id));
create policy "admins and hr manage kpi executions" on public.kpi_executions for all
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));
create policy "members read kpi execution attempts" on public.kpi_execution_attempts for select
using (public.is_company_member(company_id));
create policy "admins and hr manage kpi execution attempts" on public.kpi_execution_attempts for all
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));
