-- MVP-PR1 Phase 2: invariants that are safe without target-data assumptions.
-- Existing-row validation and People/Auth uniqueness remain gated by target preflight.

alter table public.people
  add constraint people_company_user_membership_fkey
  foreign key (company_id, user_id)
  references public.company_members(company_id, user_id)
  on delete restrict
  deferrable initially immediate
  not valid;

create or replace function public.enforce_company_member_owner_invariants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
  v_actor_user_id uuid := auth.uid();
  v_owner_count bigint;
  v_member_count bigint;
  v_actor_is_active_owner boolean;
  v_touches_owner boolean := false;
  v_removes_active_owner boolean := false;
begin
  if tg_op = 'DELETE' then
    v_company_id := old.company_id;
  else
    v_company_id := new.company_id;
  end if;

  if tg_op = 'INSERT' then
    v_touches_owner := new.role = 'owner';
  elsif tg_op = 'UPDATE' then
    v_touches_owner := old.role = 'owner' or new.role = 'owner';
    v_removes_active_owner :=
      old.role = 'owner'
      and old.status = 'active'
      and (new.role <> 'owner' or new.status <> 'active');
  else
    v_touches_owner := old.role = 'owner';
    v_removes_active_owner := old.role = 'owner' and old.status = 'active';
  end if;

  if not v_touches_owner then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  -- Serialize every owner mutation on the tenant root. If the Company itself is
  -- being deleted, its cascade is not an ownership administration operation.
  perform 1
  from public.companies
  where id = v_company_id
  for update;

  if not found then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select
    count(*) filter (where role = 'owner' and status = 'active'),
    count(*)
  into v_owner_count, v_member_count
  from public.company_members
  where company_id = v_company_id;

  -- The only owner creation that does not require an existing owner is the
  -- atomic bootstrap of the first membership by that same authenticated user.
  if tg_op = 'INSERT'
    and v_member_count = 0
    and (
      v_actor_user_id = new.user_id
      or (
        session_user in ('postgres', 'supabase_admin')
        and coalesce(current_setting('role', true), 'none') in ('none', 'postgres')
      )
    )
  then
    return new;
  end if;

  select exists (
    select 1
    from public.company_members
    where company_id = v_company_id
      and user_id = v_actor_user_id
      and role = 'owner'
      and status = 'active'
  ) into v_actor_is_active_owner;

  if not coalesce(v_actor_is_active_owner, false) then
    raise exception using
      errcode = '42501',
      message = 'OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER';
  end if;

  if v_removes_active_owner and v_owner_count <= 1 then
    raise exception using
      errcode = '23514',
      message = 'LAST_ACTIVE_OWNER_REQUIRED';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger enforce_company_member_owner_invariants
before insert or update or delete on public.company_members
for each row execute function public.enforce_company_member_owner_invariants();

revoke all on function public.enforce_company_member_owner_invariants()
from public, anon, authenticated, service_role;
