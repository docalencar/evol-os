-- PR-107 — KPI Execution Recovery & Orchestration

alter table public.kpi_executions
  add column lease_owner text,
  add column lease_id text,
  add column lease_acquired_at timestamptz,
  add column lease_expires_at timestamptz,
  add column lease_renewed_at timestamptz,
  add constraint kpi_executions_lease_consistency_check check (
    (lease_owner is null and lease_id is null and lease_acquired_at is null
      and lease_expires_at is null and lease_renewed_at is null)
    or (char_length(btrim(lease_owner)) > 0 and char_length(btrim(lease_id)) > 0
      and lease_acquired_at is not null and lease_expires_at is not null)
  ),
  add constraint kpi_executions_lease_renewal_check check (
    lease_renewed_at is null or lease_expires_at > lease_renewed_at
  );

create index kpi_executions_expired_lease_idx
on public.kpi_executions(company_id, lease_expires_at, id)
where status = 'running' and lease_expires_at is not null;

create unique index kpi_executions_active_lease_id_idx
on public.kpi_executions(company_id, lease_id)
where lease_id is not null;

create or replace function public.acquire_execution_lease(
  p_company_id uuid, p_execution_id text, p_owner_id text, p_lease_id text,
  p_acquired_at timestamptz, p_expires_at timestamptz
) returns boolean language plpgsql security invoker set search_path = public as $$
begin
  if p_expires_at <= p_acquired_at then raise exception 'KPI_EXECUTION_LEASE_INVALID_PERIOD'; end if;
  update public.kpi_executions set lease_owner = p_owner_id, lease_id = p_lease_id,
    lease_acquired_at = p_acquired_at, lease_expires_at = p_expires_at,
    lease_renewed_at = null, updated_at = p_acquired_at
  where company_id = p_company_id and id = p_execution_id and status = 'running'
    and (lease_id is null or lease_expires_at <= p_acquired_at);
  return found;
end;
$$;

create or replace function public.renew_execution_lease(
  p_company_id uuid, p_execution_id text, p_owner_id text, p_lease_id text,
  p_renewed_at timestamptz, p_expires_at timestamptz
) returns boolean language plpgsql security invoker set search_path = public as $$
begin
  if p_expires_at <= p_renewed_at then raise exception 'KPI_EXECUTION_LEASE_INVALID_PERIOD'; end if;
  update public.kpi_executions set lease_expires_at = p_expires_at,
    lease_renewed_at = p_renewed_at, updated_at = p_renewed_at
  where company_id = p_company_id and id = p_execution_id and status = 'running'
    and lease_owner = p_owner_id and lease_id = p_lease_id
    and lease_expires_at > p_renewed_at;
  return found;
end;
$$;

create or replace function public.release_execution_lease(
  p_company_id uuid, p_execution_id text, p_owner_id text, p_lease_id text,
  p_released_at timestamptz
) returns boolean language plpgsql security invoker set search_path = public as $$
begin
  update public.kpi_executions set lease_owner = null, lease_id = null, lease_acquired_at = null,
    lease_expires_at = null, lease_renewed_at = null, updated_at = p_released_at
  where company_id = p_company_id and id = p_execution_id
    and lease_owner = p_owner_id and lease_id = p_lease_id;
  return found;
end;
$$;

create or replace function public.recover_execution(
  p_company_id uuid, p_execution_id text, p_owner_id text, p_lease_id text,
  p_recovered_at timestamptz, p_retry_allowed boolean
) returns boolean language plpgsql security invoker set search_path = public as $$
begin
  update public.kpi_executions set
    status = case when p_retry_allowed then 'failed' else 'interrupted' end,
    failed_at = case when p_retry_allowed then p_recovered_at else failed_at end,
    interrupted_at = case when p_retry_allowed then interrupted_at else p_recovered_at end,
    error_snapshot = jsonb_build_object('code', 'lease_expired'),
    updated_at = p_recovered_at
  where company_id = p_company_id and id = p_execution_id and status = 'running'
    and lease_owner = p_owner_id and lease_id = p_lease_id;
  if found then
    update public.kpi_execution_attempts set status = case when p_retry_allowed then 'failed' else 'interrupted' end,
      failed_at = case when p_retry_allowed then p_recovered_at else failed_at end,
      error_snapshot = jsonb_build_object('code', 'lease_expired')
    where company_id = p_company_id and execution_id = p_execution_id and status = 'running';
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.acquire_execution_lease(uuid, text, text, text, timestamptz, timestamptz) from public;
revoke all on function public.renew_execution_lease(uuid, text, text, text, timestamptz, timestamptz) from public;
revoke all on function public.release_execution_lease(uuid, text, text, text, timestamptz) from public;
revoke all on function public.recover_execution(uuid, text, text, text, timestamptz, boolean) from public;
grant execute on function public.acquire_execution_lease(uuid, text, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.renew_execution_lease(uuid, text, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.release_execution_lease(uuid, text, text, text, timestamptz) to authenticated;
grant execute on function public.recover_execution(uuid, text, text, text, timestamptz, boolean) to authenticated;

drop policy "members read kpi executions" on public.kpi_executions;
drop policy "admins and hr manage kpi executions" on public.kpi_executions;

create policy "members read kpi executions"
on public.kpi_executions for select
using (public.is_company_member(company_id));

create policy "admins and hr manage kpi executions"
on public.kpi_executions for all
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));

-- Attempts retain the company-scoped policies created in 0058. Lease RPCs are
-- SECURITY INVOKER and therefore execute under the policies above.
