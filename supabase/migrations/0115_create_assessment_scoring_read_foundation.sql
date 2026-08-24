-- Assessment scoring read foundation: immutable perspective + snapshot-authoritative scores.

alter table public.assessment_responses add column perspective text;

update public.assessment_responses
set perspective = case when evaluator_id = employee_id then 'self' else 'legacy_unknown' end;

do $$
begin
  if exists (
    select 1 from public.assessment_responses response
    left join public.people evaluatee on evaluatee.id=response.employee_id and evaluatee.company_id=response.company_id
    left join public.people evaluator on evaluator.id=response.evaluator_id and evaluator.company_id=response.company_id
    where response.perspective is null or evaluatee.id is null or evaluator.id is null
  ) then raise exception using errcode='23514',message='ASSESSMENT_RESPONSE_PERSPECTIVE_BACKFILL_INVALID'; end if;
end $$;

alter table public.assessment_responses
  alter column perspective set not null,
  add constraint assessment_responses_perspective_check
    check (perspective in ('self','manager','direct_report','legacy_unknown'));

create index assessment_responses_company_cycle_perspective_idx
  on public.assessment_responses(company_id,assessment_cycle_id,perspective);

create or replace function public.protect_assessment_response_immutability()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if old.status in ('submitted','completed') then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_IMMUTABLE';
  end if;
  if new.company_id<>old.company_id or new.assessment_cycle_id<>old.assessment_cycle_id
    or new.assessment_template_id<>old.assessment_template_id
    or new.assessment_execution_snapshot_id<>old.assessment_execution_snapshot_id
    or new.employee_id<>old.employee_id or new.evaluator_id<>old.evaluator_id
    or new.perspective<>old.perspective then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_ASSIGNMENT_IMMUTABLE';
  end if;
  if new.completed_at is distinct from old.completed_at or new.created_at is distinct from old.created_at then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_FIELDS_IMMUTABLE';
  end if;
  if new.started_at is distinct from old.started_at and not (
    old.started_at is null and new.started_at is not null and old.status='draft' and new.status='in_progress'
  ) then raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_START_TIME_FORBIDDEN'; end if;
  if not (new.status=old.status or (old.status='draft' and new.status in ('in_progress','submitted'))
    or (old.status='in_progress' and new.status='submitted'))
    or new.status not in ('draft','in_progress','submitted') then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_TRANSITION_FORBIDDEN';
  end if;
  if new.status='submitted' and old.status<>'submitted' then new.submitted_at:=coalesce(new.submitted_at,now());
  elsif new.submitted_at is distinct from old.submitted_at then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_SUBMISSION_TIME_FORBIDDEN';
  end if;
  new.updated_at:=now(); return new;
end; $$;

-- Keep the established signature and snapshot transaction; only persist candidate perspective.
create or replace function public.generate_tenant_assessment_cycle_responses_v1(
  p_company_id uuid, p_assessment_cycle_id uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_cycle public.assessment_cycles%rowtype; v_template public.assessment_templates%rowtype;
  v_snapshot_id uuid; v_candidate_count integer:=0; v_created_count integer:=0;
  v_executable_question_count integer:=0; v_perspectives text[]:=array[]::text[];
begin
  perform public.require_people_organization_mutator(p_company_id);
  select * into v_cycle from public.assessment_cycles where id=p_assessment_cycle_id
    and company_id=p_company_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002',message='ASSESSMENT_CYCLE_NOT_FOUND'; end if;
  if v_cycle.status<>'active' then raise exception using errcode='55000',message='ASSESSMENT_CYCLE_NOT_ACTIVE'; end if;
  if v_cycle.allow_peer_assessment then raise exception using errcode='0A000',message='ASSESSMENT_PEER_SELECTION_NOT_SUPPORTED'; end if;
  select * into v_template from public.assessment_templates where id=v_cycle.assessment_template_id and company_id=p_company_id;
  if not found then raise exception using errcode='P0002',message='ASSESSMENT_TEMPLATE_NOT_FOUND'; end if;
  with candidates as (
    select p.employee_id,p.employee_id evaluator_id,'self'::text perspective
    from public.assessment_cycle_participants p join public.people x on x.id=p.employee_id and x.company_id=p.company_id and x.status='active'
    where p.company_id=p_company_id and p.assessment_cycle_id=p_assessment_cycle_id and v_cycle.allow_self_assessment
    union select p.employee_id,m.id,'manager' from public.assessment_cycle_participants p
    join public.people x on x.id=p.employee_id and x.company_id=p.company_id and x.status='active'
    join public.people m on m.id=x.manager_id and m.company_id=p.company_id and m.status='active'
    where p.company_id=p_company_id and p.assessment_cycle_id=p_assessment_cycle_id and v_cycle.allow_manager_assessment
    union select mp.employee_id,rp.employee_id,'direct_report' from public.assessment_cycle_participants mp
    join public.people m on m.id=mp.employee_id and m.company_id=mp.company_id and m.status='active'
    join public.assessment_cycle_participants rp on rp.company_id=mp.company_id and rp.assessment_cycle_id=mp.assessment_cycle_id
    join public.people r on r.id=rp.employee_id and r.company_id=rp.company_id and r.status='active' and r.manager_id=m.id
    where mp.company_id=p_company_id and mp.assessment_cycle_id=p_assessment_cycle_id and v_cycle.allow_direct_report_assessment
  ) select count(*) into v_candidate_count from candidates c where not exists (
    select 1 from public.assessment_responses r where r.assessment_cycle_id=p_assessment_cycle_id
      and r.assessment_template_id=v_cycle.assessment_template_id and r.employee_id=c.employee_id and r.evaluator_id=c.evaluator_id);
  select id into v_snapshot_id from public.assessment_execution_snapshots where assessment_cycle_id=p_assessment_cycle_id and company_id=p_company_id;
  if v_candidate_count=0 then return jsonb_build_object('status','no_change','assessmentCycleId',p_assessment_cycle_id,'createdResponseCount',0,'perspectives','[]'::jsonb); end if;
  if v_snapshot_id is null then
    if v_template.deleted_at is not null or v_template.status<>'active' or not v_template.active then raise exception using errcode='55000',message='ASSESSMENT_TEMPLATE_ARCHIVED'; end if;
    select count(*) into v_executable_question_count from public.assessment_questions q join public.assessment_sections s
      on s.id=q.assessment_section_id and s.company_id=q.company_id where q.company_id=p_company_id
      and s.assessment_template_id=v_cycle.assessment_template_id and s.active and s.deleted_at is null and q.active and q.deleted_at is null;
    if v_executable_question_count=0 then raise exception using errcode='22023',message='ASSESSMENT_EXECUTION_QUESTIONS_REQUIRED'; end if;
    insert into public.assessment_execution_snapshots(company_id,assessment_cycle_id,source_assessment_template_id,template_name,template_description,template_instructions,template_type,capture_origin)
      values(p_company_id,p_assessment_cycle_id,v_template.id,v_template.name,v_template.description,v_template.instructions,v_template.type,'response_generation') returning id into v_snapshot_id;
    insert into public.assessment_execution_snapshot_sections(company_id,assessment_execution_snapshot_id,source_assessment_section_id,code,name,description,weight,display_order,active_at_capture)
      select p_company_id,v_snapshot_id,s.id,s.code,s.name,s.description,s.weight,s.display_order,s.active and s.deleted_at is null
      from public.assessment_sections s where s.company_id=p_company_id and s.assessment_template_id=v_cycle.assessment_template_id and s.deleted_at is null order by s.display_order,s.id;
    insert into public.assessment_execution_snapshot_questions(company_id,assessment_execution_snapshot_id,assessment_execution_snapshot_section_id,source_assessment_question_id,source_competency_id,competency_name,code,question,help_text,question_type,required,weight,display_order,scale_min,scale_max,active_at_capture)
      select p_company_id,v_snapshot_id,ss.id,q.id,q.competency_id,c.name,q.code,q.question,q.help_text,q.question_type,q.required,q.weight,q.display_order,q.scale_min,q.scale_max,q.active and q.deleted_at is null and ss.active_at_capture
      from public.assessment_execution_snapshot_sections ss join public.assessment_questions q on q.assessment_section_id=ss.source_assessment_section_id and q.company_id=ss.company_id
      left join public.competencies c on c.id=q.competency_id and c.company_id=q.company_id
      where ss.assessment_execution_snapshot_id=v_snapshot_id and q.deleted_at is null order by ss.display_order,q.display_order,q.id;
  end if;
  with candidates as (
    select p.employee_id,p.employee_id evaluator_id,'self'::text perspective from public.assessment_cycle_participants p join public.people x on x.id=p.employee_id and x.company_id=p.company_id and x.status='active' where p.company_id=p_company_id and p.assessment_cycle_id=p_assessment_cycle_id and v_cycle.allow_self_assessment
    union select p.employee_id,m.id,'manager' from public.assessment_cycle_participants p join public.people x on x.id=p.employee_id and x.company_id=p.company_id and x.status='active' join public.people m on m.id=x.manager_id and m.company_id=p.company_id and m.status='active' where p.company_id=p_company_id and p.assessment_cycle_id=p_assessment_cycle_id and v_cycle.allow_manager_assessment
    union select mp.employee_id,rp.employee_id,'direct_report' from public.assessment_cycle_participants mp join public.people m on m.id=mp.employee_id and m.company_id=mp.company_id and m.status='active' join public.assessment_cycle_participants rp on rp.company_id=mp.company_id and rp.assessment_cycle_id=mp.assessment_cycle_id join public.people r on r.id=rp.employee_id and r.company_id=rp.company_id and r.status='active' and r.manager_id=m.id where mp.company_id=p_company_id and mp.assessment_cycle_id=p_assessment_cycle_id and v_cycle.allow_direct_report_assessment
  ), inserted as (
    insert into public.assessment_responses(company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective)
    select p_company_id,p_assessment_cycle_id,v_cycle.assessment_template_id,v_snapshot_id,c.employee_id,c.evaluator_id,'draft',c.perspective from candidates c
    on conflict(assessment_cycle_id,assessment_template_id,employee_id,evaluator_id) do nothing returning employee_id,evaluator_id,perspective
  ) select count(*)::integer,coalesce(array_agg(distinct perspective order by perspective),array[]::text[]) into v_created_count,v_perspectives from inserted;
  if v_created_count>0 then perform public.append_people_organization_activity(p_company_id,'assessment_cycle.responses_generated','assessments','Avaliações do ciclo geradas','As avaliações do ciclo foram geradas.','assessment_cycle',p_assessment_cycle_id,null,null,jsonb_build_object('assessmentCycleId',p_assessment_cycle_id,'createdResponseCount',v_created_count,'perspectives',to_jsonb(v_perspectives))); end if;
  return jsonb_build_object('status',case when v_created_count=0 then 'no_change' else 'succeeded' end,'assessmentCycleId',p_assessment_cycle_id,'createdResponseCount',v_created_count,'perspectives',to_jsonb(v_perspectives));
end; $$;

create or replace function public.get_tenant_assessment_scored_result_v1(p_company_id uuid,p_response_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_response public.assessment_responses%rowtype; v_visibility text; v_actor uuid; v_role text;
  v_full boolean:=false; v_sections jsonb; v_questions jsonb; v_competencies jsonb;
  v_answers jsonb:='[]'::jsonb; v_overall numeric;
begin
  if auth.uid() is null then raise exception using errcode='28000',message='AUTH_REQUIRED'; end if;
  v_actor:=public.current_person_id(p_company_id);
  select r.* into v_response from public.assessment_responses r
    where r.id=p_response_id and r.company_id=p_company_id and r.status in ('submitted','completed');
  if not found then raise exception using errcode='P0002',message='ASSESSMENT_RESULT_NOT_AVAILABLE'; end if;
  select c.assessment_visibility into v_visibility from public.assessment_cycles c
    where c.id=v_response.assessment_cycle_id and c.company_id=v_response.company_id;
  select membership.role into v_role from public.company_members membership where membership.company_id=p_company_id and membership.user_id=auth.uid() and membership.status='active';
  v_full:=v_actor=v_response.evaluator_id or v_role in ('owner','admin','hr');
  if not v_full and v_actor<>v_response.employee_id then raise exception using errcode='42501',message='ASSESSMENT_RESULT_FORBIDDEN'; end if;
  if not v_full and v_visibility='none' then raise exception using errcode='42501',message='ASSESSMENT_RESULT_NOT_VISIBLE'; end if;
  if v_role in ('owner','admin','hr') and v_actor<>v_response.evaluator_id
    and v_actor<>v_response.employee_id then
    perform public.audit_secure_administrative_read(p_company_id,'assessments',
      'assessment_response',p_response_id,'read_scored_response','read_scored_response');
  end if;
  if exists(select 1 from public.assessment_execution_snapshot_questions q where q.assessment_execution_snapshot_id=v_response.assessment_execution_snapshot_id and q.active_at_capture and q.question_type='scale' and (q.scale_min is null or q.scale_max is null or q.scale_max<=q.scale_min)) then raise exception using errcode='22023',message='ASSESSMENT_SCORING_BOUNDS_INVALID'; end if;
  with scored as (
    select s.id section_id,s.source_assessment_section_id,s.name,s.display_order,s.weight section_weight,
      q.id question_id,q.source_assessment_question_id,q.question,q.question_type,q.required,q.weight question_weight,q.display_order question_order,q.scale_min,q.scale_max,q.source_competency_id,q.competency_name,
      a.answer_text,a.answer_number,a.answer_boolean,a.score,
      case when q.question_type='scale' and a.score is not null then ((a.score-q.scale_min)::numeric/(q.scale_max-q.scale_min)::numeric)*100 end normalized
    from public.assessment_execution_snapshot_sections s join public.assessment_execution_snapshot_questions q on q.assessment_execution_snapshot_section_id=s.id and q.company_id=s.company_id
    left join public.assessment_answers a on a.assessment_response_id=p_response_id and a.assessment_execution_snapshot_question_id=q.id and a.company_id=q.company_id
    where s.assessment_execution_snapshot_id=v_response.assessment_execution_snapshot_id and s.active_at_capture and q.active_at_capture
  ), section_scores as (select section_id,source_assessment_section_id,name,display_order,section_weight,sum(normalized*question_weight)/nullif(sum(question_weight) filter(where normalized is not null),0) score from scored group by section_id,source_assessment_section_id,name,display_order,section_weight)
  select sum(score*section_weight)/nullif(sum(section_weight) filter(where score is not null),0),
    coalesce(jsonb_agg(jsonb_build_object('snapshotSectionId',section_id,'sourceSectionId',source_assessment_section_id,'name',name,'displayOrder',display_order,'weight',section_weight,'score',score) order by display_order,section_id),'[]'::jsonb)
  into v_overall,v_sections from section_scores;
  with scored as (
    select q.id snapshot_question_id,q.source_assessment_question_id,q.assessment_execution_snapshot_section_id,q.question,q.question_type,q.required,q.weight,q.display_order,q.scale_min,q.scale_max,q.source_competency_id,q.competency_name,a.answer_text,a.answer_number,a.answer_boolean,a.score,
      case when q.question_type='scale' and a.score is not null then ((a.score-q.scale_min)::numeric/(q.scale_max-q.scale_min)::numeric)*100 end normalized
    from public.assessment_execution_snapshot_questions q left join public.assessment_answers a on a.assessment_response_id=p_response_id and a.assessment_execution_snapshot_question_id=q.id and a.company_id=q.company_id
    where q.assessment_execution_snapshot_id=v_response.assessment_execution_snapshot_id and q.active_at_capture
  ) select coalesce(jsonb_agg(jsonb_build_object('snapshotQuestionId',snapshot_question_id,'sourceQuestionId',source_assessment_question_id,'snapshotSectionId',assessment_execution_snapshot_section_id,'prompt',question,'type',question_type,'required',required,'weight',weight,'displayOrder',display_order,'scaleMin',scale_min,'scaleMax',scale_max,'answerText',answer_text,'answerNumber',answer_number,'answerBoolean',answer_boolean,'rawScore',score,'normalizedScore',normalized,'competencyId',source_competency_id,'competencyName',competency_name) order by assessment_execution_snapshot_section_id,display_order,snapshot_question_id),'[]'::jsonb) into v_questions from scored;
  with scored as (select q.source_competency_id,q.competency_name,q.weight,((a.score-q.scale_min)::numeric/(q.scale_max-q.scale_min)::numeric)*100 normalized from public.assessment_execution_snapshot_questions q join public.assessment_answers a on a.assessment_response_id=p_response_id and a.assessment_execution_snapshot_question_id=q.id and a.company_id=q.company_id where q.assessment_execution_snapshot_id=v_response.assessment_execution_snapshot_id and q.active_at_capture and q.question_type='scale' and q.source_competency_id is not null and a.score is not null)
  select coalesce(jsonb_agg(jsonb_build_object('competencyId',source_competency_id,'competencyName',competency_name,'score',score) order by competency_name,source_competency_id),'[]'::jsonb) into v_competencies from (select source_competency_id,max(competency_name) competency_name,sum(normalized*weight)/sum(weight) score from scored group by source_competency_id) x;
  if v_full or v_visibility='full' then
    select coalesce(jsonb_agg(jsonb_build_object('sourceQuestionId',q.source_assessment_question_id,
      'rawScore',a.score,'answerText',a.answer_text,'answerNumber',a.answer_number,
      'answerBoolean',a.answer_boolean) order by q.display_order,q.id),'[]'::jsonb)
    into v_answers from public.assessment_execution_snapshot_questions q
    join public.assessment_answers a on a.assessment_response_id=p_response_id
      and a.assessment_execution_snapshot_question_id=q.id and a.company_id=q.company_id;
  elsif v_visibility='score_and_comments' then
    select coalesce(jsonb_agg(jsonb_build_object('sourceQuestionId',q.source_assessment_question_id,
      'rawScore',a.score,'answerText',a.answer_text,'answerNumber',null,
      'answerBoolean',null) order by q.display_order,q.id),'[]'::jsonb)
    into v_answers from public.assessment_execution_snapshot_questions q
    join public.assessment_answers a on a.assessment_response_id=p_response_id
      and a.assessment_execution_snapshot_question_id=q.id and a.company_id=q.company_id;
  end if;
  if not v_full then
    if v_visibility not in ('score_and_competencies','full') then v_sections:='[]'::jsonb; v_competencies:='[]'::jsonb; end if;
    if v_visibility<>'full' then v_questions:='[]'::jsonb; end if;
  end if;
  return jsonb_build_object('assessmentResponseId',v_response.id,'status',v_response.status,'perspective',v_response.perspective,'visibility',v_visibility,'formulaVersion','response-scale-weighted-v1','overallScore',v_overall,'sections',v_sections,'questions',v_questions,'competencies',v_competencies,'answers',v_answers);
end; $$;

create or replace function public.read_assessment_result_for_evaluatee(
  p_company_id uuid,p_assessment_response_id uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='28000',message='AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.assessment_responses response
    where response.id=p_assessment_response_id and response.company_id=p_company_id
      and response.employee_id=public.current_person_id(p_company_id)
  ) then raise exception using errcode='42501',message='ASSESSMENT_RESULT_NOT_VISIBLE'; end if;
  return public.get_tenant_assessment_scored_result_v1(p_company_id,p_assessment_response_id);
end; $$;

revoke all on function public.get_tenant_assessment_scored_result_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_tenant_assessment_scored_result_v1(uuid,uuid) to authenticated;
revoke all on function public.read_assessment_result_for_evaluatee(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.read_assessment_result_for_evaluatee(uuid,uuid) to authenticated;
revoke all on function public.generate_tenant_assessment_cycle_responses_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.generate_tenant_assessment_cycle_responses_v1(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
