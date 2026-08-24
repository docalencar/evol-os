-- Fail-closed tenant authorization for normalized Assessment scored results.

create or replace function public.get_tenant_assessment_scored_result_v1(p_company_id uuid,p_response_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_response public.assessment_responses%rowtype; v_visibility text; v_actor uuid; v_role text;
  v_full boolean:=false; v_sections jsonb; v_questions jsonb; v_competencies jsonb;
  v_answers jsonb:='[]'::jsonb; v_overall numeric;
begin
  if auth.uid() is null then raise exception using errcode='28000',message='AUTH_REQUIRED'; end if;
  v_actor:=public.current_person_id(p_company_id);
  select membership.role into v_role from public.company_members membership
    where membership.company_id=p_company_id and membership.user_id=auth.uid()
      and membership.status='active';
  if not public.is_company_member(p_company_id) or v_actor is null or v_role is null then
    raise exception using errcode='42501',message='ASSESSMENT_RESULT_FORBIDDEN';
  end if;
  select r.* into v_response from public.assessment_responses r
    where r.id=p_response_id and r.company_id=p_company_id and r.status in ('submitted','completed');
  if not found then raise exception using errcode='P0002',message='ASSESSMENT_RESULT_NOT_AVAILABLE'; end if;
  select c.assessment_visibility into v_visibility from public.assessment_cycles c
    where c.id=v_response.assessment_cycle_id and c.company_id=v_response.company_id;
  v_full:=coalesce(v_actor=v_response.evaluator_id,false)
    or coalesce(v_role in ('owner','admin','hr'),false);
  if not v_full and v_actor is distinct from v_response.employee_id then
    raise exception using errcode='42501',message='ASSESSMENT_RESULT_FORBIDDEN';
  end if;
  if not v_full and v_visibility='none' then raise exception using errcode='42501',message='ASSESSMENT_RESULT_NOT_VISIBLE'; end if;
  if coalesce(v_role in ('owner','admin','hr'),false)
    and v_actor is distinct from v_response.evaluator_id
    and v_actor is distinct from v_response.employee_id then
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
declare v_actor uuid;
begin
  if auth.uid() is null then raise exception using errcode='28000',message='AUTH_REQUIRED'; end if;
  v_actor:=public.current_person_id(p_company_id);
  if not public.is_company_member(p_company_id) or v_actor is null then
    raise exception using errcode='42501',message='ASSESSMENT_RESULT_NOT_VISIBLE';
  end if;
  if not exists (
    select 1 from public.assessment_responses response
    where response.id=p_assessment_response_id and response.company_id=p_company_id
      and response.employee_id=v_actor
  ) then raise exception using errcode='42501',message='ASSESSMENT_RESULT_NOT_VISIBLE'; end if;
  return public.get_tenant_assessment_scored_result_v1(p_company_id,p_assessment_response_id);
end; $$;

revoke all on function public.get_tenant_assessment_scored_result_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_tenant_assessment_scored_result_v1(uuid,uuid) to authenticated;
revoke all on function public.read_assessment_result_for_evaluatee(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.read_assessment_result_for_evaluatee(uuid,uuid) to authenticated;

notify pgrst,'reload schema';
