-- MVP closure PR 10A: authenticated active-tenant enumeration.
--
-- authenticated intentionally has no direct SELECT privilege on
-- company_members. This narrow projection derives the actor from auth.uid(),
-- exposes only the active tenants that belong to that actor and grants no
-- tenant authority by itself.

create or replace function public.get_current_user_active_tenants_v1()
returns table (
  company_id uuid,
  company_name text,
  membership_role text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception using
      errcode = '42501',
      message = 'AUTHENTICATION_REQUIRED';
  end if;

  return query
  select
    membership.company_id,
    company.name,
    membership.role
  from public.company_members as membership
  join public.companies as company
    on company.id = membership.company_id
  where membership.user_id = v_actor
    and membership.status = 'active'
  order by membership.company_id;
end;
$$;

revoke all on function public.get_current_user_active_tenants_v1()
from public, anon, service_role;

grant execute on function public.get_current_user_active_tenants_v1()
to authenticated;

comment on function public.get_current_user_active_tenants_v1() is
  'Returns only active tenant identities and stored roles for auth.uid(). It accepts no selector and grants no tenant authority.';
