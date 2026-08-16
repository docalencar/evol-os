-- MVP Closure PR B: management read projections for People and Organization.
-- Selectors grant no authority; every function derives the actor from auth.uid().

create or replace function public.get_tenant_people_management_v1(p_company_id uuid)
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
  where p.company_id=p_company_id and p.status <> 'terminated'
  order by p.full_name,p.id;
end; $$;

create or replace function public.get_tenant_person_profile_v1(p_company_id uuid,p_person_id uuid)
returns table(person_id uuid,full_name text,email text,phone text,birth_date date,hire_date date,
  status text,has_user_access boolean,manager_id uuid,manager_name text,team_id uuid,team_name text,
  position_id uuid,position_name text,disc_profile text,avatar_url text,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select * from public.get_tenant_people_management_v1(p_company_id) p where p.person_id=p_person_id;
end; $$;

create or replace function public.get_tenant_departments_management_v1(p_company_id uuid)
returns table(department_id uuid,name text,description text,leader_id uuid,parent_department_id uuid,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select d.id,d.name,d.description,d.manager_id,d.parent_department_id,d.created_at,d.updated_at
    from public.departments d where d.company_id=p_company_id and d.deleted_at is null order by d.name,d.id;
end; $$;

create or replace function public.get_tenant_teams_management_v1(p_company_id uuid)
returns table(team_id uuid,name text,description text,department_id uuid,parent_team_id uuid,leader_id uuid,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select t.id,t.name,t.description,t.department_id,t.parent_team_id,t.manager_id,t.created_at,t.updated_at
    from public.teams t where t.company_id=p_company_id and t.deleted_at is null order by t.name,t.id;
end; $$;

create or replace function public.get_tenant_positions_management_v1(p_company_id uuid)
returns table(position_id uuid,name text,description text,department_id uuid,hierarchical_level text,status text,
  weekly_workload_hours integer,work_model text,employment_type text,travel_requirement text,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select p.id,p.name,p.description,p.department_id,p.hierarchical_level,p.status,
    p.weekly_workload_hours,p.work_model,p.employment_type,p.travel_requirement,p.created_at,p.updated_at
    from public.positions p where p.company_id=p_company_id and p.deleted_at is null order by p.name,p.id;
end; $$;

create or replace function public.get_tenant_position_requirements_v1(p_company_id uuid,p_position_id uuid)
returns table(requirement_id uuid,position_id uuid,category text,value text,required boolean,notes text,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select r.id,r.position_id,r.category,r.value,r.required,r.notes,r.created_at,r.updated_at
    from public.position_requirements r where r.company_id=p_company_id and r.position_id=p_position_id and r.archived_at is null
    order by r.created_at,r.id;
end; $$;

create or replace function public.get_tenant_position_competencies_v1(p_company_id uuid,p_position_id uuid)
returns table(position_competency_id uuid,position_id uuid,competency_id uuid,competency_name text,
  expected_level integer,weight integer,required boolean,competency_type text,notes text,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select pc.id,pc.position_id,pc.competency_id,c.name,pc.expected_level,pc.weight,pc.required,pc.type,pc.notes,pc.created_at,pc.updated_at
    from public.position_competencies pc join public.competencies c on c.id=pc.competency_id and c.company_id=pc.company_id
    where pc.company_id=p_company_id and pc.position_id=p_position_id and pc.archived_at is null order by pc.created_at,pc.id;
end; $$;

create or replace function public.get_tenant_entity_activity_timeline_v1(
  p_company_id uuid,p_entity_type text,p_entity_id uuid,p_limit integer default 20)
returns table(activity_id uuid,activity_type text,module text,title text,description text,actor_type text,
  entity_type text,entity_id uuid,occurred_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  if p_entity_type is null or p_entity_type not in ('department','team','position','person') then
    raise exception using errcode='22023',message='ACTIVITY_ENTITY_TYPE_INVALID';
  end if;
  if p_entity_id is null then raise exception using errcode='22023',message='ACTIVITY_ENTITY_ID_REQUIRED'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then raise exception using errcode='22023',message='ACTIVITY_LIMIT_OUT_OF_RANGE'; end if;
  return query select e.id,e.activity_type,e.module,e.title,e.description,e.actor_type,e.entity_type,e.entity_id,
    e.occurred_at,e.created_at from public.activity_events e
    where e.company_id=p_company_id and e.entity_type=p_entity_type and e.entity_id=p_entity_id
      and e.visibility='company'
    order by e.occurred_at desc,e.id desc limit p_limit;
end; $$;

revoke all on function public.get_tenant_people_management_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_person_profile_v1(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_departments_management_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_teams_management_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_positions_management_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_position_requirements_v1(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_position_competencies_v1(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer) from public,anon,authenticated,service_role;

grant execute on function public.get_tenant_people_management_v1(uuid),public.get_tenant_person_profile_v1(uuid,uuid),
  public.get_tenant_departments_management_v1(uuid),public.get_tenant_teams_management_v1(uuid),
  public.get_tenant_positions_management_v1(uuid),public.get_tenant_position_requirements_v1(uuid,uuid),
  public.get_tenant_position_competencies_v1(uuid,uuid),public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)
to authenticated;
