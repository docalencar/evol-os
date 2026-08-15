-- MVP-PR1 Phase 9 / PR 9E1: additive membership-management target identity.
--
-- V1 remains unchanged for DB-first compatibility with the deployed 9D2 strict
-- parser. V2 adds only the tenant-scoped membership UUID used as a selector by
-- the existing trusted mutation RPCs. It grants no authority by itself.

create or replace function public.get_people_access_state_v2(
  p_company_id uuid
)
returns table (
  person_id uuid,
  membership_id uuid,
  membership_role text,
  membership_status text,
  invitation_id uuid,
  invitation_role text,
  invitation_status text,
  invitation_generation integer,
  invitation_expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_tenant_access_administrator(p_company_id, false);

  return query
  select
    access_state.person_id,
    membership.id as membership_id,
    access_state.membership_role,
    access_state.membership_status,
    access_state.invitation_id,
    access_state.invitation_role,
    access_state.invitation_status,
    access_state.invitation_generation,
    access_state.invitation_expires_at
  from public.get_people_access_state_v1(p_company_id) as access_state
  join public.people as person
    on person.id = access_state.person_id
   and person.company_id = p_company_id
  left join public.company_members as membership
    on membership.company_id = person.company_id
   and membership.user_id = person.user_id
  order by access_state.person_id;
end;
$$;

revoke all on function public.get_people_access_state_v2(uuid)
from public, anon, service_role;

grant execute on function public.get_people_access_state_v2(uuid)
to authenticated;

comment on function public.get_people_access_state_v2(uuid) is
  'V2 of the tenant-admin People access-state projection. Adds only membership_id as a selector for trusted membership mutations; auth.uid() and active owner/admin membership remain authority.';
