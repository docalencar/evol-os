-- MVP Closure PR E: management read boundaries for Competencies and Development.

create or replace function public.get_tenant_competencies_management_v1(p_company_id uuid)
returns table(competency_id uuid, name text, description text, category text,
  expected_level integer, weight integer, active boolean,
  created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select c.id,c.name,c.description,c.category,c.expected_level,c.weight,c.active,c.created_at,c.updated_at
    from public.competencies c where c.company_id=p_company_id and c.active=true
    order by c.name,c.id;
end; $$;

create or replace function public.get_tenant_development_plans_management_v1(p_company_id uuid,p_plan_id uuid default null)
returns table(plan_id uuid,employee_id uuid,owner_id uuid,template_id uuid,title text,description text,
  status text,priority text,start_date date,due_date date,completed_at timestamptz,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select p.id,p.employee_id,p.owner_id,p.template_id,p.title,p.description,p.status,p.priority,
    p.start_date,p.due_date,p.completed_at,p.created_at,p.updated_at from public.development_plans p
    where p.company_id=p_company_id and (p_plan_id is null or p.id=p_plan_id)
    order by p.created_at desc,p.id;
end; $$;

create or replace function public.get_tenant_development_goals_management_v1(p_company_id uuid,p_plan_id uuid default null)
returns table(goal_id uuid,plan_id uuid,competency_id uuid,title text,description text,current_level integer,
  expected_level integer,target_level integer,status text,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select g.id,g.plan_id,g.competency_id,g.title,g.description,g.current_level,g.expected_level,
    g.target_level,g.status,g.created_at,g.updated_at from public.development_goals g
    join public.development_plans p on p.id=g.plan_id and p.company_id=g.company_id
    where g.company_id=p_company_id and (p_plan_id is null or g.plan_id=p_plan_id)
    order by g.created_at,g.id;
end; $$;

create or replace function public.get_tenant_development_actions_management_v1(p_company_id uuid,p_plan_id uuid default null)
returns table(action_id uuid,goal_id uuid,plan_id uuid,title text,description text,action_type text,status text,
  due_date date,completed_at timestamptz,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select a.id,a.goal_id,g.plan_id,a.title,a.description,a.type,a.status,a.due_date,a.completed_at,a.created_at,a.updated_at
    from public.development_actions a join public.development_goals g on g.id=a.goal_id and g.company_id=a.company_id
    join public.development_plans p on p.id=g.plan_id and p.company_id=g.company_id
    where a.company_id=p_company_id and (p_plan_id is null or g.plan_id=p_plan_id)
    order by a.created_at,a.id;
end; $$;

create or replace function public.get_tenant_development_templates_management_v1(p_company_id uuid,p_template_id uuid default null)
returns table(template_id uuid,name text,description text,scope text,suggested_duration_days integer,active boolean,
  created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select t.id,t.name,t.description,t.scope,t.suggested_duration_days,t.active,t.created_at,t.updated_at
    from public.development_templates t where t.active=true
      and (t.scope='global' or (t.scope='company' and t.company_id=p_company_id))
      and (p_template_id is null or t.id=p_template_id)
    order by t.scope,t.name,t.id;
end; $$;

create or replace function public.get_tenant_development_template_goals_v1(p_company_id uuid,p_template_id uuid)
returns table(template_goal_id uuid,template_id uuid,competency_id uuid,competency_name text,description text,
  suggested_target_level integer,order_index integer,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select g.id,g.template_id,g.competency_id,c.name,g.description,g.suggested_target_level,g.order_index,g.created_at,g.updated_at
    from public.development_template_goals g
    join public.development_templates t on t.id=g.template_id
    left join public.competencies c on c.id=g.competency_id and (c.company_id=p_company_id or c.company_id is null)
    where g.template_id=p_template_id and t.active=true
      and (t.scope='global' or (t.scope='company' and t.company_id=p_company_id))
    order by g.order_index,g.id;
end; $$;

create or replace function public.get_tenant_development_template_actions_v1(p_company_id uuid,p_template_id uuid)
returns table(template_action_id uuid,template_goal_id uuid,title text,description text,action_type text,
  suggested_due_days integer,order_index integer,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select a.id,a.template_goal_id,a.title,a.description,a.type,a.suggested_due_days,a.order_index,a.created_at,a.updated_at
    from public.development_template_actions a join public.development_template_goals g on g.id=a.template_goal_id
    join public.development_templates t on t.id=g.template_id
    where g.template_id=p_template_id and t.active=true
      and (t.scope='global' or (t.scope='company' and t.company_id=p_company_id))
    order by a.template_goal_id,a.order_index,a.id;
end; $$;

revoke all on function public.get_tenant_competencies_management_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_development_plans_management_v1(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_development_goals_management_v1(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_development_actions_management_v1(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_development_templates_management_v1(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_development_template_goals_v1(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_development_template_actions_v1(uuid,uuid) from public,anon,authenticated,service_role;

grant execute on function public.get_tenant_competencies_management_v1(uuid),
  public.get_tenant_development_plans_management_v1(uuid,uuid),
  public.get_tenant_development_goals_management_v1(uuid,uuid),
  public.get_tenant_development_actions_management_v1(uuid,uuid),
  public.get_tenant_development_templates_management_v1(uuid,uuid),
  public.get_tenant_development_template_goals_v1(uuid,uuid),
  public.get_tenant_development_template_actions_v1(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
