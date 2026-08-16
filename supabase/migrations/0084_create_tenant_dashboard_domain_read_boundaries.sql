-- MVP Closure PR 10F2: narrow remaining dashboard-domain read projections.

create or replace function public.get_tenant_development_dashboard_v1(p_company_id uuid)
returns table(record_type text, record_id uuid, parent_id uuid, employee_id uuid,
  owner_id uuid, template_id uuid, competency_id uuid, label text, status text,
  priority text, action_type text, current_level integer, expected_level integer,
  target_level integer, start_date date, due_date date, completed_at timestamptz,
  scope text, suggested_duration_days integer)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query
  select * from (
    select 'plan'::text,p.id,null::uuid,p.employee_id,p.owner_id,p.template_id,null::uuid,p.title,p.status,p.priority,null::text,null::integer,null::integer,null::integer,p.start_date,p.due_date,p.completed_at,null::text,null::integer from public.development_plans p where p.company_id=p_company_id
    union all select 'goal',g.id,g.plan_id,null,null,null,g.competency_id,g.title,g.status,null,null,g.current_level,g.expected_level,g.target_level,null,null,null,null,null from public.development_goals g where g.company_id=p_company_id
    union all select 'action',a.id,a.goal_id,null,null,null,null,a.title,a.status,null,a.type,null,null,null,null,a.due_date,a.completed_at,null,null from public.development_actions a where a.company_id=p_company_id
    union all select 'template',t.id,null,null,null,null,null,t.name,null,null,null,null,null,null,null,null,null,t.scope,t.suggested_duration_days from public.development_templates t where t.active=true and (t.scope='global' or (t.scope='company' and t.company_id=p_company_id))
  ) as d(
    record_type, record_id, parent_id, employee_id, owner_id, template_id,
    competency_id, label, status, priority, action_type, current_level,
    expected_level, target_level, start_date, due_date, completed_at, scope,
    suggested_duration_days
  ) order by d.record_type,d.label,d.record_id;
end; $$;

create or replace function public.get_tenant_competency_directory_v1(p_company_id uuid)
returns table(record_type text, record_id uuid, employee_id uuid, position_id uuid,
  competency_id uuid, competency_name text, current_level integer,
  expected_level integer, weight numeric, required boolean)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select * from (
    select 'employee'::text,ec.id,ec.employee_id,null::uuid,ec.competency_id,c.name,ec.current_level,null::integer,null::numeric,null::boolean
      from public.employee_competencies ec join public.competencies c on c.id=ec.competency_id and c.company_id=ec.company_id where ec.company_id=p_company_id and ec.archived_at is null
    union all
    select 'position',pc.id,null,pc.position_id,pc.competency_id,c.name,null,pc.expected_level,pc.weight,pc.required
      from public.position_competencies pc join public.competencies c on c.id=pc.competency_id and c.company_id=pc.company_id where pc.company_id=p_company_id and pc.archived_at is null
  ) as x(
    record_type, record_id, employee_id, position_id, competency_id,
    competency_name, current_level, expected_level, weight, required
  ) order by x.record_type,x.competency_name,x.record_id;
end; $$;

create or replace function public.get_tenant_recruitment_job_openings_v1(p_company_id uuid)
returns table(job_opening_id uuid,title text,status text,priority text,department_id uuid,
  position_id uuid,requesting_manager_id uuid,recruiter_id uuid,target_hire_date date,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select j.id,j.title,j.status,j.priority,j.department_id,j.position_id,
    j.requesting_manager_id,j.recruiter_id,j.target_hire_date,j.updated_at
    from public.recruitment_job_openings j where j.company_id=p_company_id and j.deleted_at is null
    order by j.updated_at desc,j.id;
end; $$;

create or replace function public.get_tenant_activity_timeline_v1(p_company_id uuid,p_limit integer default 20)
returns table(activity_id uuid,activity_type text,module text,title text,description text,
  actor_type text,actor_id uuid,entity_type text,entity_id uuid,subject_type text,
  subject_id uuid,visibility text,metadata jsonb,occurred_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then raise exception using errcode='22023',message='ACTIVITY_LIMIT_OUT_OF_RANGE'; end if;
  return query select e.id,e.activity_type,e.module,e.title,e.description,e.actor_type,e.actor_id,
    e.entity_type,e.entity_id,e.subject_type,e.subject_id,e.visibility,e.metadata,e.occurred_at,e.created_at
    from public.activity_events e where e.company_id=p_company_id
    order by e.occurred_at desc,e.id desc limit p_limit;
end; $$;

revoke all on function public.get_tenant_development_dashboard_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_competency_directory_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_recruitment_job_openings_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_activity_timeline_v1(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.get_tenant_development_dashboard_v1(uuid),public.get_tenant_competency_directory_v1(uuid),public.get_tenant_recruitment_job_openings_v1(uuid),public.get_tenant_activity_timeline_v1(uuid,integer) to authenticated;
