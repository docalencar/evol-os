-- MVP Closure: purpose-bound Assessment and privacy-first Feedback read boundaries.

create or replace function public.get_tenant_assessment_catalog_v1(p_company_id uuid)
returns table(record_type text, record_id uuid, name text, description text, instructions text,
  assessment_type text, status text, active boolean, template_id uuid, start_date date,
  end_date date, close_date date, allow_self_assessment boolean, allow_manager_assessment boolean,
  allow_peer_assessment boolean, allow_direct_report_assessment boolean, anonymous boolean,
  assessment_visibility text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.has_company_role(p_company_id,array['owner','admin','hr']) then
    raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED';
  end if;
  return query select rows.* from (
    select 'template'::text,t.id,t.name,t.description,t.instructions,t.type,t.status,t.active,
      null::uuid,null::date,null::date,null::date,null::boolean,null::boolean,null::boolean,
      null::boolean,null::boolean,null::text
    from public.assessment_templates t
    where t.company_id=p_company_id and t.deleted_at is null
    union all
    select 'cycle',c.id,c.name,c.description,null,c.assessment_type,c.status,null,c.assessment_template_id,
      c.start_date,c.end_date,c.close_date,c.allow_self_assessment,c.allow_manager_assessment,
      c.allow_peer_assessment,c.allow_direct_report_assessment,c.anonymous,c.assessment_visibility
    from public.assessment_cycles c
    where c.company_id=p_company_id and c.deleted_at is null
    ) rows order by 1,3,2;
end; $$;

create or replace function public.get_tenant_assessment_template_structure_v1(p_company_id uuid,p_template_id uuid)
returns table(record_type text, record_id uuid, parent_id uuid, name text, description text,
  instructions text, assessment_type text, status text, icon text, color text, weight numeric,
  display_order integer, question text, help_text text, question_type text, scale_min integer,
  scale_max integer, required boolean, active boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.has_company_role(p_company_id,array['owner','admin','hr']) then
    raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED';
  end if;
  return query select rows.* from (
    select 'template'::text,t.id,null::uuid,t.name,t.description,t.instructions,t.type,t.status,
      null::text,null::text,null::numeric,null::integer,null::text,null::text,null::text,
      null::integer,null::integer,null::boolean,t.active
    from public.assessment_templates t
    where t.company_id=p_company_id and t.id=p_template_id and t.deleted_at is null
    union all
    select 'section',s.id,s.assessment_template_id,s.name,s.description,null,null,null,s.icon,s.color,
      s.weight,s.display_order,null,null,null,null,null,null,s.active
    from public.assessment_sections s join public.assessment_templates t
      on t.id=s.assessment_template_id and t.company_id=s.company_id
    where s.company_id=p_company_id and s.assessment_template_id=p_template_id
      and s.deleted_at is null and t.deleted_at is null
    union all
    select 'question',q.id,q.assessment_section_id,null,null,null,null,null,null,null,q.weight,
      q.display_order,q.question,q.help_text,q.question_type,q.scale_min,q.scale_max,q.required,q.active
    from public.assessment_questions q join public.assessment_sections s
      on s.id=q.assessment_section_id and s.company_id=q.company_id
    join public.assessment_templates t on t.id=s.assessment_template_id and t.company_id=s.company_id
    where q.company_id=p_company_id and t.id=p_template_id and q.deleted_at is null
      and s.deleted_at is null and t.deleted_at is null
    ) rows order by 1,12,2;
end; $$;

create or replace function public.get_tenant_assessment_cycle_management_v1(p_company_id uuid,p_cycle_id uuid)
returns table(record_type text, record_id uuid, person_id uuid, full_name text, email text,
  name text, description text, assessment_type text, status text, template_id uuid,
  start_date date, end_date date, close_date date, allow_self_assessment boolean,
  allow_manager_assessment boolean, allow_peer_assessment boolean,
  allow_direct_report_assessment boolean, anonymous boolean, assessment_visibility text,
  created_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.has_company_role(p_company_id,array['owner','admin','hr']) then
    raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED';
  end if;
  return query select rows.* from (
    select 'cycle'::text,c.id,null::uuid,null::text,null::text,c.name,c.description,c.assessment_type,
      c.status,c.assessment_template_id,c.start_date,c.end_date,c.close_date,c.allow_self_assessment,
      c.allow_manager_assessment,c.allow_peer_assessment,c.allow_direct_report_assessment,c.anonymous,
      c.assessment_visibility,c.created_at
    from public.assessment_cycles c
    where c.company_id=p_company_id and c.id=p_cycle_id and c.deleted_at is null
    union all
    select 'participant',cp.id,p.id,p.full_name,p.email,null,null,null,null,null,null,null,null,
      null,null,null,null,null,null,cp.created_at
    from public.assessment_cycle_participants cp
    join public.assessment_cycles c on c.id=cp.assessment_cycle_id and c.company_id=cp.company_id
    join public.people p on p.id=cp.employee_id and p.company_id=cp.company_id
    where cp.company_id=p_company_id and cp.assessment_cycle_id=p_cycle_id and c.deleted_at is null
    ) rows order by 1,20,2;
end; $$;

create or replace function public.get_assessment_evaluator_workspace_v1(p_company_id uuid,p_response_id uuid)
returns table(record_type text, record_id uuid, parent_id uuid, template_id uuid, cycle_id uuid,
  employee_id uuid, evaluator_id uuid, status text, name text, description text, instructions text,
  assessment_type text, icon text, color text, weight numeric, display_order integer, question text,
  help_text text, question_type text, scale_min integer, scale_max integer, required boolean,
  active boolean, started_at timestamptz, completed_at timestamptz, submitted_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_template_id uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select r.assessment_template_id into v_template_id
  from public.assessment_responses r
  where r.company_id=p_company_id and r.id=p_response_id
    and r.evaluator_id=public.current_person_id(p_company_id)
    and public.is_company_member(p_company_id);
  if v_template_id is null then return; end if;
  return query select rows.* from (
    select 'response'::text,r.id,null::uuid,r.assessment_template_id,r.assessment_cycle_id,r.employee_id,
      r.evaluator_id,r.status,null::text,null::text,null::text,null::text,null::text,null::text,
      null::numeric,null::integer,null::text,null::text,null::text,null::integer,null::integer,
      null::boolean,null::boolean,r.started_at,r.completed_at,r.submitted_at
    from public.assessment_responses r where r.company_id=p_company_id and r.id=p_response_id
    union all
    select 'template',t.id,null,t.id,null,null,null,t.status,t.name,t.description,t.instructions,t.type,
      null,null,null,null,null,null,null,null,null,null,t.active,null,null,null
    from public.assessment_templates t where t.company_id=p_company_id and t.id=v_template_id
    union all
    select 'section',s.id,s.assessment_template_id,v_template_id,null,null,null,null,s.name,s.description,
      null,null,s.icon,s.color,s.weight,s.display_order,null,null,null,null,null,null,s.active,null,null,null
    from public.assessment_sections s where s.company_id=p_company_id
      and s.assessment_template_id=v_template_id and s.deleted_at is null
    union all
    select 'question',q.id,q.assessment_section_id,v_template_id,null,null,null,null,null,null,null,null,
      null,null,q.weight,q.display_order,q.question,q.help_text,q.question_type,q.scale_min,q.scale_max,
      q.required,q.active,null,null,null
    from public.assessment_questions q join public.assessment_sections s
      on s.id=q.assessment_section_id and s.company_id=q.company_id
    where q.company_id=p_company_id and s.assessment_template_id=v_template_id
      and q.deleted_at is null and s.deleted_at is null
    ) rows order by 1,16,2;
end; $$;

create or replace function public.get_current_person_feedback_threads_v1(p_company_id uuid)
returns table(thread_id uuid,sender_person_id uuid,receiver_person_id uuid,sender_name text,
  receiver_name text,title text,thread_type text,priority text,status text,updated_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_person uuid; v_role text;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select cm.role into v_role from public.company_members cm
    where cm.company_id=p_company_id and cm.user_id=auth.uid() and cm.status='active';
  if v_role is null then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  v_person:=public.current_person_id(p_company_id);
  return query select t.id,t.sender_employee_id,t.receiver_employee_id,s.full_name,r.full_name,t.title,
    t.type,t.priority,t.status,t.updated_at
  from public.feedback_threads t join public.people s on s.id=t.sender_employee_id and s.company_id=t.company_id
  join public.people r on r.id=t.receiver_employee_id and r.company_id=t.company_id
  where t.company_id=p_company_id and (v_person in (t.sender_employee_id,t.receiver_employee_id)
    or (v_role='hr' and t.visibility='hr'))
  order by t.updated_at desc,t.id;
end; $$;

create or replace function public.get_feedback_thread_detail_v1(p_company_id uuid,p_thread_id uuid)
returns table(thread_id uuid,sender_person_id uuid,receiver_person_id uuid,sender_name text,
  receiver_name text,title text,thread_type text,priority text,status text,visibility text,
  requires_follow_up boolean,follow_up_at timestamptz,acknowledged_at timestamptz,
  closed_at timestamptz,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_person uuid; v_role text;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select cm.role into v_role from public.company_members cm
    where cm.company_id=p_company_id and cm.user_id=auth.uid() and cm.status='active';
  if v_role is null then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  v_person:=public.current_person_id(p_company_id);
  return query select t.id,t.sender_employee_id,t.receiver_employee_id,s.full_name,r.full_name,t.title,
    t.type,t.priority,t.status,t.visibility,t.requires_follow_up,t.follow_up_at,t.acknowledged_at,
    t.closed_at,t.created_at,t.updated_at
  from public.feedback_threads t join public.people s on s.id=t.sender_employee_id and s.company_id=t.company_id
  join public.people r on r.id=t.receiver_employee_id and r.company_id=t.company_id
  where t.company_id=p_company_id and t.id=p_thread_id
    and (v_person in (t.sender_employee_id,t.receiver_employee_id) or (v_role='hr' and t.visibility='hr'));
end; $$;

create or replace function public.get_feedback_thread_messages_v1(p_company_id uuid,p_thread_id uuid)
returns table(message_id uuid,author_person_id uuid,author_name text,message_type text,content text,
  edited_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_person uuid; v_role text; v_allowed boolean;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select cm.role into v_role from public.company_members cm
    where cm.company_id=p_company_id and cm.user_id=auth.uid() and cm.status='active';
  if v_role is null then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  v_person:=public.current_person_id(p_company_id);
  select exists(select 1 from public.feedback_threads t where t.company_id=p_company_id and t.id=p_thread_id
    and (v_person in (t.sender_employee_id,t.receiver_employee_id) or (v_role='hr' and t.visibility='hr'))) into v_allowed;
  if not v_allowed then return; end if;
  return query select m.id,m.author_employee_id,p.full_name,m.type,m.content,m.edited_at,m.created_at
  from public.feedback_messages m left join public.people p on p.id=m.author_employee_id and p.company_id=m.company_id
  where m.company_id=p_company_id and m.thread_id=p_thread_id order by m.created_at,m.id;
end; $$;

revoke all on function public.get_tenant_assessment_catalog_v1(uuid),
  public.get_tenant_assessment_template_structure_v1(uuid,uuid),
  public.get_tenant_assessment_cycle_management_v1(uuid,uuid),
  public.get_assessment_evaluator_workspace_v1(uuid,uuid),
  public.get_current_person_feedback_threads_v1(uuid),
  public.get_feedback_thread_detail_v1(uuid,uuid),
  public.get_feedback_thread_messages_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_tenant_assessment_catalog_v1(uuid),
  public.get_tenant_assessment_template_structure_v1(uuid,uuid),
  public.get_tenant_assessment_cycle_management_v1(uuid,uuid),
  public.get_assessment_evaluator_workspace_v1(uuid,uuid),
  public.get_current_person_feedback_threads_v1(uuid),
  public.get_feedback_thread_detail_v1(uuid,uuid),
  public.get_feedback_thread_messages_v1(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
