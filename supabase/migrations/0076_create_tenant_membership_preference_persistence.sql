-- MVP-PR1 Phase 7 (PR 7B): protected tenant-preference persistence.
-- Additive and DORMANT: no production consumer reads or writes this preference
-- yet (the switch Action, resolver wiring and feature flag land in PR 7C).
-- The preference is CONTEXT, never authority: it can only reference a company
-- where the user has an ACTIVE membership (enforced by the trusted write RPC),
-- and it is re-validated against active memberships by the resolver on every
-- resolution (PR 7A). Reuses the taxonomy reserved in migration 0070
-- (operation 'tenant_select', audit event 'tenant.selected', target
-- 'tenant_preference') and the trusted-persistence helpers from 0074.

-- One active-tenant preference per user.
create table public.tenant_membership_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_company_id uuid not null references public.companies(id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.tenant_membership_preferences enable row level security;

-- Reads are self-only. Direct writes by authenticated are not granted; the
-- preference is written exclusively through the SECURITY DEFINER RPC below.
revoke all on table public.tenant_membership_preferences from public, anon, authenticated;
grant select on table public.tenant_membership_preferences to authenticated;
grant select, insert, update on table public.tenant_membership_preferences to service_role;

create policy "users read own tenant preference"
on public.tenant_membership_preferences
for select
using (user_id = auth.uid());

-- Trusted write: select the active tenant.
-- p_company_id is intent input only, never authority. The function derives the
-- actor from auth.uid(), proves an ACTIVE membership in that company, reserves a
-- 'tenant_select' operation, upserts the single-row preference (last-write-wins
-- for the user's own latest choice), appends a 'tenant.selected' audit event and
-- completes the operation. It never creates a membership, never changes a role,
-- and never derives authority from the preference.
create or replace function public.select_active_tenant_v1(
  p_company_id uuid,
  p_idempotency_key text,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_res jsonb;
  v_op uuid;
  v_member public.company_members%rowtype;
  v_result jsonb;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  v_res := public.reserve_tenant_access_operation(
    p_company_id, 'tenant_select', p_idempotency_key,
    jsonb_build_object('companyId', p_company_id, 'actor', v_actor),
    p_correlation_id
  );
  if v_res ->> 'status' <> 'acquired' then
    return v_res;
  end if;
  v_op := (v_res ->> 'operationId')::uuid;

  -- Prove an active membership for the actor in the intended company. The row
  -- lock serializes against a concurrent membership deactivation.
  select * into v_member
  from public.company_members
  where company_id = p_company_id and user_id = v_actor
  for update;

  if not found or v_member.status <> 'active' then
    return public.fail_tenant_access_operation(
      v_op, p_company_id, 'TENANT_MEMBERSHIP_NOT_FOUND', 'denied',
      'tenant.selected', 'tenant_preference', p_company_id, v_actor, p_correlation_id
    );
  end if;

  insert into public.tenant_membership_preferences (user_id, preferred_company_id)
  values (v_actor, p_company_id)
  on conflict (user_id) do update
    set preferred_company_id = excluded.preferred_company_id,
        updated_at = now();

  perform public.append_tenant_access_audit(
    v_op, p_company_id, 'tenant.selected', 'tenant_preference',
    p_company_id, v_actor, p_correlation_id,
    jsonb_build_object('preferredCompanyId', p_company_id)
  );

  v_result := jsonb_build_object('preferredCompanyId', p_company_id, 'status', 'selected');
  return public.complete_tenant_access_operation(v_op, v_result);
end;
$$;

revoke all on function public.select_active_tenant_v1(uuid, text, uuid)
  from public, anon, service_role;
grant execute on function public.select_active_tenant_v1(uuid, text, uuid)
  to authenticated;
