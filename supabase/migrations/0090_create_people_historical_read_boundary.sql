-- MVP Closure PR J1: historical People read boundary.
--
-- get_tenant_people_management_v1 / get_tenant_person_profile_v1 intentionally
-- exclude terminated people (operational selectors rely on that). This migration
-- is ADDITIVE: it introduces v2 variants that return ALL lifecycle statuses
-- (including 'terminated') so authorized management views can show historical
-- people (Desligados) and compute historical vs current-headcount counts.
--
-- Security is identical to the approved 0085 boundary: SECURITY DEFINER, hardened
-- search_path, actor from auth.uid(), active-membership gate (is_company_member),
-- company-scoped, has_user_access as a boolean only (no Auth IDs), execute revoked
-- from PUBLIC/anon/service_role and granted to authenticated. No table grants.
-- Migration 0085 is NOT modified.

create or replace function public.get_tenant_people_management_v2(p_company_id uuid)
returns table(person_id uuid,full_name text,email text,phone text,birth_date date,hire_date date,
  status text,has_user_access boolean,manager_id uuid,manager_name text,team_id uuid,team_name text,
  position_id uuid,position_name text,disc_profile text,avatar_url text,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select p.id,p.full_name,p.email,p.phone,p.birth_date,p.hire_date,p.status,
    p.user_id is not null,m.id,m.full_name,t.id,t.name,pos.id,pos.name,p.disc_profile,p.avatar_url,p.created_at,p.updated_at
  from public.people p
  left join public.people m on m.id=p.manager_id and m.company_id=p.company_id
  left join public.teams t on t.id=p.team_id and t.company_id=p.company_id and t.deleted_at is null
  left join public.positions pos on pos.id=p.position_id and pos.company_id=p.company_id and pos.deleted_at is null
  where p.company_id=p_company_id
  order by p.full_name,p.id;
end; $$;

create or replace function public.get_tenant_person_profile_v2(p_company_id uuid,p_person_id uuid)
returns table(person_id uuid,full_name text,email text,phone text,birth_date date,hire_date date,
  status text,has_user_access boolean,manager_id uuid,manager_name text,team_id uuid,team_name text,
  position_id uuid,position_name text,disc_profile text,avatar_url text,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select * from public.get_tenant_people_management_v2(p_company_id) p where p.person_id=p_person_id;
end; $$;

revoke all on function public.get_tenant_people_management_v2(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_person_profile_v2(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_tenant_people_management_v2(uuid),public.get_tenant_person_profile_v2(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
