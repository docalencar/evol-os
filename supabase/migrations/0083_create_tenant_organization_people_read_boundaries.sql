-- MVP Closure PR 10F1: narrow Organization and People directory projections.
-- The company UUID is a selector only. The authenticated actor and an active
-- membership in that tenant remain the authority. No table grants or policies
-- are changed by this migration.

create or replace function public.get_tenant_organization_directory_v1(
  p_company_id uuid
)
returns table (
  entity_type text,
  entity_id uuid,
  name text,
  status text,
  department_id uuid,
  parent_entity_id uuid
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.is_company_member(p_company_id) then
    raise exception using
      errcode = '42501',
      message = 'TENANT_AUTHORIZATION_DENIED';
  end if;

  return query
  select directory.entity_type,
    directory.entity_id,
    directory.name,
    directory.status,
    directory.department_id,
    directory.parent_entity_id
  from (
    select 'department'::text as entity_type,
      department.id as entity_id,
      department.name,
      null::text as status,
      null::uuid as department_id,
      department.parent_department_id as parent_entity_id
    from public.departments as department
    where department.company_id = p_company_id
      and department.deleted_at is null

    union all

    select 'team'::text,
      team.id,
      team.name,
      null::text,
      team.department_id,
      team.parent_team_id
    from public.teams as team
    where team.company_id = p_company_id
      and team.deleted_at is null

    union all

    select 'position'::text,
      position.id,
      position.name,
      position.status,
      position.department_id,
      null::uuid
    from public.positions as position
    where position.company_id = p_company_id
      and position.deleted_at is null
  ) as directory
  order by directory.entity_type, directory.name, directory.entity_id;
end;
$$;

revoke all on function public.get_tenant_organization_directory_v1(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.get_tenant_organization_directory_v1(uuid)
to authenticated;

comment on function public.get_tenant_organization_directory_v1(uuid) is
  'Returns the minimal active Organization directory for an authenticated active tenant member. p_company_id is a selector and grants no authority.';

create or replace function public.get_tenant_people_directory_v1(
  p_company_id uuid
)
returns table (
  person_id uuid,
  full_name text,
  status text,
  manager_id uuid,
  manager_name text,
  team_id uuid,
  team_name text,
  position_id uuid,
  position_name text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.is_company_member(p_company_id) then
    raise exception using
      errcode = '42501',
      message = 'TENANT_AUTHORIZATION_DENIED';
  end if;

  return query
  select person.id,
    person.full_name,
    person.status,
    manager.id,
    manager.full_name,
    team.id,
    team.name,
    position.id,
    position.name
  from public.people as person
  left join public.people as manager
    on manager.id = person.manager_id
   and manager.company_id = person.company_id
   and manager.status <> 'terminated'
  left join public.teams as team
    on team.id = person.team_id
   and team.company_id = person.company_id
   and team.deleted_at is null
  left join public.positions as position
    on position.id = person.position_id
   and position.company_id = person.company_id
   and position.deleted_at is null
  where person.company_id = p_company_id
    and person.status <> 'terminated'
  order by person.full_name, person.id;
end;
$$;

revoke all on function public.get_tenant_people_directory_v1(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.get_tenant_people_directory_v1(uuid)
to authenticated;

comment on function public.get_tenant_people_directory_v1(uuid) is
  'Returns the minimal non-terminated People directory and tenant-safe structural names for an authenticated active tenant member. It excludes Auth IDs and contact data.';
