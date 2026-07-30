-- PR-108 — Worker Runtime lease reservation for ready work

create or replace function public.acquire_execution_lease(
  p_company_id uuid, p_execution_id text, p_owner_id text, p_lease_id text,
  p_acquired_at timestamptz, p_expires_at timestamptz
) returns boolean language plpgsql security invoker set search_path = public as $$
begin
  if p_expires_at <= p_acquired_at then raise exception 'KPI_EXECUTION_LEASE_INVALID_PERIOD'; end if;
  update public.kpi_executions set lease_owner = p_owner_id, lease_id = p_lease_id,
    lease_acquired_at = p_acquired_at, lease_expires_at = p_expires_at,
    lease_renewed_at = null, updated_at = p_acquired_at
  where company_id = p_company_id and id = p_execution_id
    and status in ('pending', 'failed', 'running')
    and (lease_id is null or lease_expires_at <= p_acquired_at);
  return found;
end;
$$;

revoke all on function public.acquire_execution_lease(
  uuid, text, text, text, timestamptz, timestamptz
) from public;
grant execute on function public.acquire_execution_lease(
  uuid, text, text, text, timestamptz, timestamptz
) to authenticated;

-- The function is SECURITY INVOKER and remains governed by the company-scoped
-- owner/admin/hr policy on kpi_executions.
