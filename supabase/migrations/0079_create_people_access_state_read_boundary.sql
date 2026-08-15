-- MVP-PR1 Phase 9 / PR 9D1: secure People access-state read boundary.
--
-- Invitation rows remain closed to direct authenticated reads. This narrow
-- projection derives the human actor from auth.uid(), reuses the established
-- tenant administrator authorization helper and exposes no invitation secret,
-- email or Auth identity.

create or replace function public.get_people_access_state_v1(
  p_company_id uuid
)
returns table (
  person_id uuid,
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
    person.id as person_id,
    membership.role as membership_role,
    membership.status as membership_status,
    invitation.id as invitation_id,
    invitation.intended_role as invitation_role,
    case
      when invitation.status = 'pending'
        and invitation.expires_at <= statement_timestamp()
      then 'expired'
      else invitation.status
    end as invitation_status,
    invitation.generation as invitation_generation,
    invitation.expires_at as invitation_expires_at
  from public.people as person
  left join public.company_members as membership
    on membership.company_id = person.company_id
   and membership.user_id = person.user_id
  left join lateral (
    select
      candidate.id,
      candidate.intended_role,
      candidate.status,
      candidate.generation,
      candidate.expires_at
    from public.company_member_invitations as candidate
    where candidate.company_id = person.company_id
      and candidate.person_id = person.id
    order by
      candidate.updated_at desc,
      candidate.created_at desc,
      candidate.id desc
    limit 1
  ) as invitation on true
  where person.company_id = p_company_id
    and person.status <> 'terminated'
  order by person.id;
end;
$$;

revoke all on function public.get_people_access_state_v1(uuid)
from public, anon, service_role;

grant execute on function public.get_people_access_state_v1(uuid)
to authenticated;

comment on function public.get_people_access_state_v1(uuid) is
  'Returns the minimal tenant-admin People membership/invitation projection. p_company_id is a selector; auth.uid() and active owner/admin membership remain authority.';
