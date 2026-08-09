-- MVP-PR1 Phase 2 completion after approved production target preflight.
-- Production contained no Company, membership or People rows; no backfill is needed.

create unique index people_company_user_key
on public.people(company_id, user_id)
where user_id is not null;

alter table public.people
  validate constraint people_company_user_membership_fkey;

create or replace function public.enforce_active_membership_people_invariant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'active' and (
    select count(*)
    from public.people
    where company_id = new.company_id
      and user_id = new.user_id
  ) <> 1 then
    raise exception using
      errcode = '23514',
      message = 'ACTIVE_MEMBERSHIP_REQUIRES_EXACTLY_ONE_PERSON';
  end if;

  return new;
end;
$$;

create constraint trigger enforce_active_membership_has_people
after insert or update on public.company_members
deferrable initially deferred
for each row execute function public.enforce_active_membership_people_invariant();

create or replace function public.protect_active_membership_people_link()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_link_removed boolean;
begin
  if old.user_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    v_old_link_removed := true;
  else
    v_old_link_removed := new.company_id is distinct from old.company_id
      or new.user_id is distinct from old.user_id;
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

create constraint trigger protect_active_membership_people_link
after update or delete on public.people
deferrable initially deferred
for each row execute function public.protect_active_membership_people_link();

revoke all on function public.enforce_active_membership_people_invariant()
from public, anon, authenticated, service_role;

revoke all on function public.protect_active_membership_people_link()
from public, anon, authenticated, service_role;
