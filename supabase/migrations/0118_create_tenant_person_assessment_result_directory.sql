-- Purpose-bound administrative discovery of one Person's official Assessment
-- Results. Scoring is shared with the existing individual Result boundary, but
-- authorization and auditing remain the responsibility of each public wrapper.
--
-- SECURITY HARDENING FOR INVALID NULL VISIBILITY STATE
-- ----------------------------------------------------
-- Compatibility guarantee: 0118 preserves all observable 0115/0116
-- scored-result behavior for valid visibility values ('none', 'score',
-- 'score_and_competencies', 'score_and_comments', 'full'). The previously
-- unsafe visibility = NULL state is now explicitly rejected fail-closed.
--
-- This is NOT a change to valid visibility policy.
--
-- public.assessment_cycles.assessment_visibility is NOT NULL with a CHECK
-- constraint restricting it to the five modes above (0062). A NULL therefore
-- never represents a legitimate configuration: it can only arise when the
-- Cycle lookup finds no row, i.e. a tenant-incoherent Response whose Cycle
-- belongs to another company. In 0115/0116 that invalid historical state fell
-- through the minimization logic, because SQL three-valued logic makes both
-- `v_visibility not in (...)` and `v_visibility <> 'full'` evaluate to NULL
-- rather than true -- so the minimization branches were skipped and sections,
-- questions and competencies were returned to an evaluatee who was entitled to
-- none of them. The state now fails closed on the scorer/helper path.
--
-- Error contract: the established project vocabulary already owns this
-- meaning, so no new public error string is introduced. The caller receives
-- ASSESSMENT_RESULT_NOT_VISIBLE (SQLSTATE 42501), the same sanitized
-- fail-closed contract already returned for visibility = 'none'.

create or replace function public.compute_assessment_scored_result_v1(
  p_company_id uuid,
  p_response_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_response public.assessment_responses%rowtype;
  v_visibility text;
  v_sections jsonb;
  v_questions jsonb;
  v_competencies jsonb;
  v_answers jsonb;
  v_overall numeric;
begin
  select response.*
  into v_response
  from public.assessment_responses response
  where response.id = p_response_id
    and response.company_id = p_company_id
    and response.status in ('submitted', 'completed');

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_RESULT_NOT_AVAILABLE';
  end if;

  select cycle.assessment_visibility
  into v_visibility
  from public.assessment_cycles cycle
  where cycle.id = v_response.assessment_cycle_id
    and cycle.company_id = v_response.company_id;

  -- Fail closed on the invalid NULL visibility state. See the header note.
  -- Kept here as defence in depth: the public wrapper rejects the same state
  -- earlier, but the helper must never project a Result it cannot minimize.
  if v_visibility is null then
    raise exception using errcode = '42501', message = 'ASSESSMENT_RESULT_NOT_VISIBLE';
  end if;

  if exists (
    select 1
    from public.assessment_execution_snapshot_questions question
    where question.assessment_execution_snapshot_id = v_response.assessment_execution_snapshot_id
      and question.company_id = p_company_id
      and question.active_at_capture
      and question.question_type = 'scale'
      and (
        question.scale_min is null
        or question.scale_max is null
        or question.scale_max <= question.scale_min
      )
  ) then
    raise exception using errcode = '22023', message = 'ASSESSMENT_SCORING_BOUNDS_INVALID';
  end if;

  with scored as (
    select
      section.id as section_id,
      section.source_assessment_section_id,
      section.name,
      section.display_order,
      section.weight as section_weight,
      question.weight as question_weight,
      case
        when question.question_type = 'scale' and answer.score is not null
          then ((answer.score - question.scale_min)::numeric
            / (question.scale_max - question.scale_min)::numeric) * 100
      end as normalized
    from public.assessment_execution_snapshot_sections section
    join public.assessment_execution_snapshot_questions question
      on question.assessment_execution_snapshot_section_id = section.id
     and question.company_id = section.company_id
    left join public.assessment_answers answer
      on answer.assessment_response_id = p_response_id
     and answer.assessment_execution_snapshot_question_id = question.id
     and answer.company_id = question.company_id
    where section.assessment_execution_snapshot_id = v_response.assessment_execution_snapshot_id
      and section.company_id = p_company_id
      and section.active_at_capture
      and question.active_at_capture
  ), section_scores as (
    select
      section_id,
      source_assessment_section_id,
      name,
      display_order,
      section_weight,
      sum(normalized * question_weight)
        / nullif(sum(question_weight) filter (where normalized is not null), 0) as score
    from scored
    group by section_id, source_assessment_section_id, name, display_order, section_weight
  )
  select
    sum(score * section_weight)
      / nullif(sum(section_weight) filter (where score is not null), 0),
    coalesce(jsonb_agg(jsonb_build_object(
      'snapshotSectionId', section_id,
      'sourceSectionId', source_assessment_section_id,
      'name', name,
      'displayOrder', display_order,
      'weight', section_weight,
      'score', score
    ) order by display_order, section_id), '[]'::jsonb)
  into v_overall, v_sections
  from section_scores;

  with scored as (
    select
      question.id as snapshot_question_id,
      question.source_assessment_question_id,
      question.assessment_execution_snapshot_section_id,
      question.question,
      question.question_type,
      question.required,
      question.weight,
      question.display_order,
      question.scale_min,
      question.scale_max,
      question.source_competency_id,
      question.competency_name,
      answer.answer_text,
      answer.answer_number,
      answer.answer_boolean,
      answer.score,
      case
        when question.question_type = 'scale' and answer.score is not null
          then ((answer.score - question.scale_min)::numeric
            / (question.scale_max - question.scale_min)::numeric) * 100
      end as normalized
    from public.assessment_execution_snapshot_questions question
    left join public.assessment_answers answer
      on answer.assessment_response_id = p_response_id
     and answer.assessment_execution_snapshot_question_id = question.id
     and answer.company_id = question.company_id
    where question.assessment_execution_snapshot_id = v_response.assessment_execution_snapshot_id
      and question.company_id = p_company_id
      and question.active_at_capture
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'snapshotQuestionId', snapshot_question_id,
    'sourceQuestionId', source_assessment_question_id,
    'snapshotSectionId', assessment_execution_snapshot_section_id,
    'prompt', question,
    'type', question_type,
    'required', required,
    'weight', weight,
    'displayOrder', display_order,
    'scaleMin', scale_min,
    'scaleMax', scale_max,
    'answerText', answer_text,
    'answerNumber', answer_number,
    'answerBoolean', answer_boolean,
    'rawScore', score,
    'normalizedScore', normalized,
    'competencyId', source_competency_id,
    'competencyName', competency_name
  ) order by assessment_execution_snapshot_section_id, display_order, snapshot_question_id), '[]'::jsonb)
  into v_questions
  from scored;

  with scored as (
    select
      question.source_competency_id,
      question.competency_name,
      question.weight,
      ((answer.score - question.scale_min)::numeric
        / (question.scale_max - question.scale_min)::numeric) * 100 as normalized
    from public.assessment_execution_snapshot_questions question
    join public.assessment_answers answer
      on answer.assessment_response_id = p_response_id
     and answer.assessment_execution_snapshot_question_id = question.id
     and answer.company_id = question.company_id
    where question.assessment_execution_snapshot_id = v_response.assessment_execution_snapshot_id
      and question.company_id = p_company_id
      and question.active_at_capture
      and question.question_type = 'scale'
      and question.source_competency_id is not null
      and answer.score is not null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'competencyId', source_competency_id,
    'competencyName', competency_name,
    'score', score
  ) order by competency_name, source_competency_id), '[]'::jsonb)
  into v_competencies
  from (
    select
      source_competency_id,
      max(competency_name) as competency_name,
      sum(normalized * weight) / sum(weight) as score
    from scored
    group by source_competency_id
  ) competency_scores;

  select coalesce(jsonb_agg(jsonb_build_object(
    'sourceQuestionId', question.source_assessment_question_id,
    'rawScore', answer.score,
    'answerText', answer.answer_text,
    'answerNumber', answer.answer_number,
    'answerBoolean', answer.answer_boolean
  ) order by question.display_order, question.id), '[]'::jsonb)
  into v_answers
  from public.assessment_execution_snapshot_questions question
  join public.assessment_answers answer
    on answer.assessment_response_id = p_response_id
   and answer.assessment_execution_snapshot_question_id = question.id
   and answer.company_id = question.company_id
  where question.assessment_execution_snapshot_id = v_response.assessment_execution_snapshot_id
    and question.company_id = p_company_id;

  return jsonb_build_object(
    'assessmentResponseId', v_response.id,
    'status', v_response.status,
    'perspective', v_response.perspective,
    'visibility', v_visibility,
    'formulaVersion', 'response-scale-weighted-v1',
    'overallScore', v_overall,
    'sections', v_sections,
    'questions', v_questions,
    'competencies', v_competencies,
    'answers', v_answers
  );
end;
$$;

revoke all on function public.compute_assessment_scored_result_v1(uuid, uuid)
  from public, anon, authenticated, service_role;

create or replace function public.get_tenant_assessment_scored_result_v1(
  p_company_id uuid,
  p_response_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_response public.assessment_responses%rowtype;
  v_visibility text;
  v_actor uuid;
  v_role text;
  v_full boolean := false;
  v_result jsonb;
  v_comment_answers jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  v_actor := public.current_person_id(p_company_id);
  select membership.role
  into v_role
  from public.company_members membership
  where membership.company_id = p_company_id
    and membership.user_id = auth.uid()
    and membership.status = 'active';

  if public.is_company_member(p_company_id) is not true
    or v_actor is null
    or v_role is null then
    raise exception using errcode = '42501', message = 'ASSESSMENT_RESULT_FORBIDDEN';
  end if;

  select response.*
  into v_response
  from public.assessment_responses response
  where response.id = p_response_id
    and response.company_id = p_company_id
    and response.status in ('submitted', 'completed');

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_RESULT_NOT_AVAILABLE';
  end if;

  select cycle.assessment_visibility
  into v_visibility
  from public.assessment_cycles cycle
  where cycle.id = v_response.assessment_cycle_id
    and cycle.company_id = v_response.company_id;

  v_full := coalesce(v_actor = v_response.evaluator_id, false)
    or coalesce(v_role in ('owner', 'admin', 'hr'), false);

  if not v_full and v_actor is distinct from v_response.employee_id then
    raise exception using errcode = '42501', message = 'ASSESSMENT_RESULT_FORBIDDEN';
  end if;

  -- Fail closed on the invalid NULL visibility state, for every caller. See
  -- the header note. Placed after the evaluatee authorization check so that an
  -- unrelated member cannot use the distinct error to probe which Responses
  -- are tenant-incoherent, and before the administrative audit so that a
  -- rejected read never emits a successful-read Activity.
  if v_visibility is null then
    raise exception using errcode = '42501', message = 'ASSESSMENT_RESULT_NOT_VISIBLE';
  end if;

  if not v_full and v_visibility = 'none' then
    raise exception using errcode = '42501', message = 'ASSESSMENT_RESULT_NOT_VISIBLE';
  end if;

  if coalesce(v_role in ('owner', 'admin', 'hr'), false)
    and v_actor is distinct from v_response.evaluator_id
    and v_actor is distinct from v_response.employee_id then
    perform public.audit_secure_administrative_read(
      p_company_id,
      'assessments',
      'assessment_response',
      p_response_id,
      'read_scored_response',
      'read_scored_response'
    );
  end if;

  v_result := public.compute_assessment_scored_result_v1(p_company_id, p_response_id);

  if not v_full then
    if v_visibility not in ('score_and_competencies', 'full') then
      v_result := jsonb_set(v_result, '{sections}', '[]'::jsonb);
      v_result := jsonb_set(v_result, '{competencies}', '[]'::jsonb);
    end if;

    if v_visibility <> 'full' then
      v_result := jsonb_set(v_result, '{questions}', '[]'::jsonb);
    end if;

    if v_visibility = 'score_and_comments' then
      select coalesce(jsonb_agg(jsonb_build_object(
        'sourceQuestionId', answer -> 'sourceQuestionId',
        'rawScore', answer -> 'rawScore',
        'answerText', answer -> 'answerText',
        'answerNumber', null,
        'answerBoolean', null
      )), '[]'::jsonb)
      into v_comment_answers
      from jsonb_array_elements(v_result -> 'answers') answer;

      v_result := jsonb_set(v_result, '{answers}', v_comment_answers);
    elsif v_visibility <> 'full' then
      v_result := jsonb_set(v_result, '{answers}', '[]'::jsonb);
    end if;
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_tenant_assessment_scored_result_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_tenant_assessment_scored_result_v1(uuid, uuid)
  to authenticated;

create or replace function public.get_tenant_person_assessment_result_directory_v1(
  p_company_id uuid,
  p_person_id uuid
)
returns table(
  cycle_id uuid,
  cycle_name text,
  model_name text,
  cycle_date date,
  response_id uuid,
  perspective text,
  response_status text,
  submitted_at timestamptz,
  completed_at timestamptz,
  overall_score numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  select membership.role
  into v_role
  from public.company_members membership
  where membership.company_id = p_company_id
    and membership.user_id = auth.uid()
    and membership.status = 'active';

  if public.is_company_member(p_company_id) is not true
    or v_role is null
    or v_role not in ('owner', 'admin', 'hr') then
    raise exception using errcode = '42501', message = 'ASSESSMENT_PERSON_RESULT_DIRECTORY_FORBIDDEN';
  end if;

  if not exists (
    select 1
    from public.people person
    where person.id = p_person_id
      and person.company_id = p_company_id
  ) then
    raise exception using errcode = '42501', message = 'ASSESSMENT_PERSON_RESULT_DIRECTORY_FORBIDDEN';
  end if;

  perform public.audit_secure_administrative_read(
    p_company_id,
    'assessments',
    'person',
    p_person_id,
    'read_person_result_directory',
    'view_person_latest_assessment_results'
  );

  return query
  select
    cycle.id,
    cycle.name,
    snapshot.template_name,
    coalesce(cycle.close_date, cycle.end_date, cycle.start_date),
    response.id,
    response.perspective,
    response.status,
    response.submitted_at,
    response.completed_at,
    nullif(
      public.compute_assessment_scored_result_v1(p_company_id, response.id) ->> 'overallScore',
      ''
    )::numeric
  from public.assessment_responses response
  join public.assessment_cycles cycle
    on cycle.id = response.assessment_cycle_id
   and cycle.company_id = response.company_id
  join public.assessment_execution_snapshots snapshot
    on snapshot.id = response.assessment_execution_snapshot_id
   and snapshot.company_id = response.company_id
   and snapshot.assessment_cycle_id = response.assessment_cycle_id
  where response.company_id = p_company_id
    and response.employee_id = p_person_id
    and response.status in ('submitted', 'completed')
    and response.perspective in ('self', 'manager', 'legacy_unknown')
  order by
    coalesce(
      response.submitted_at,
      response.completed_at,
      cycle.close_date::timestamptz,
      cycle.end_date::timestamptz,
      cycle.start_date::timestamptz
    ) desc,
    response.id;
end;
$$;

revoke all on function public.get_tenant_person_assessment_result_directory_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_tenant_person_assessment_result_directory_v1(uuid, uuid)
  to authenticated;

notify pgrst, 'reload schema';
