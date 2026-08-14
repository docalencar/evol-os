-- MVP-PR1 Phase 8 / PR 8C:
-- Harden the People/Auth identity-link boundary.
--
-- Normal People CRUD remains policy-controlled. The constraint trigger fires only
-- AFTER UPDATE OR DELETE (see migration 0072), so this migration protects only the
-- establishment or replacement of people.user_id THROUGH AN UPDATE. Creating a
-- People row already linked at INSERT time (e.g. the create_company_with_owner
-- owner bootstrap) is a separate, legitimate path and is intentionally NOT gated
-- here.
--
-- A NULL -> user_id link via UPDATE is accepted only when the current transaction
-- has already established the trusted invitation-acceptance state for the same
-- tenant, Person and authenticated user.
--
-- Existing protection against independently removing/changing a link that
-- backs an active membership remains intact.

create or replace function public.protect_active_membership_people_link()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_link_removed boolean;
  v_new_link_established boolean;
  v_trusted_acceptance boolean;
begin
  if tg_op = 'DELETE' then
    v_old_link_removed := old.user_id is not null;
    v_new_link_established := false;
  else
    v_old_link_removed :=
      old.user_id is not null
      and (
        new.company_id is distinct from old.company_id
        or new.user_id is distinct from old.user_id
      );

    v_new_link_established :=
      new.user_id is not null
      and (
        old.user_id is null
        or new.company_id is distinct from old.company_id
        or new.user_id is distinct from old.user_id
      );
  end if;

  if v_new_link_established then
    select exists (
      select 1
      from public.company_member_invitations invitation
      join public.company_members membership
        on membership.company_id = invitation.company_id
       and membership.user_id = invitation.accepted_by_user_id
       and membership.status = 'active'
      where invitation.company_id = new.company_id
        and invitation.person_id = new.id
        and invitation.status = 'accepted'
        and invitation.accepted_by_user_id = new.user_id
        and invitation.accepted_by_user_id = auth.uid()
        and invitation.accepted_at = transaction_timestamp()
    )
    into v_trusted_acceptance;

    if not coalesce(v_trusted_acceptance, false) then
      raise exception using
        errcode = '42501',
        message = 'PEOPLE_USER_LINK_REQUIRES_TRUSTED_ACCEPTANCE';
    end if;
  end if;

  if v_old_link_removed
    and exists (
      select 1
      from public.company_members
      where company_id = old.company_id
        and user_id = old.user_id
        and status = 'active'
    )
    and not exists (
      select 1
      from public.people
      where company_id = old.company_id
        and user_id = old.user_id
    )
  then
    raise exception using
      errcode = '23514',
      message = 'ACTIVE_MEMBERSHIP_REQUIRES_EXACTLY_ONE_PERSON';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

comment on function public.protect_active_membership_people_link() is
  'Protects active membership People links and restricts UPDATE-based establishment/replacement of people.user_id to trusted invitation acceptance state. INSERT-time linkage (e.g. the owner bootstrap in create_company_with_owner) is not gated by this trigger, which fires only AFTER UPDATE OR DELETE.';

revoke all on function public.protect_active_membership_people_link()
from public, anon, authenticated, service_role;

-- Rollback strategy:
-- Restore the function body from migration
-- 0072_complete_tenant_membership_invariants.sql.
-- Never disable RLS or the constraint trigger as rollback.
