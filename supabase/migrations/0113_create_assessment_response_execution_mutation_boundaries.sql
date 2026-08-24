-- Trusted Assessment Response execution mutations.
--
-- Responses still execute against the live Model structure until
-- ASSESSMENT TEMPLATE EXECUTION SNAPSHOT is implemented. Only active,
-- non-deleted Questions in active, non-deleted Sections are answerable.
-- The evaluator lifecycle ends at submitted; completed remains future/internal.

alter table public.assessment_answers
  drop constraint if exists assessment_answers_score_check;

alter table public.assessment_answers
  drop constraint if exists assessment_answers_single_payload_check;

alter table public.assessment_answers
  add constraint assessment_answers_single_payload_check
  check (
    assessment_response_id is null
    or num_nonnulls(answer_text, answer_number, answer_boolean, score) = 1
  ) not valid;

create or replace function public.protect_assessment_response_immutability()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if old.status in ('submitted', 'completed') then
    raise exception using errcode = '55000', message = 'ASSESSMENT_RESPONSE_IMMUTABLE';
  end if;

  if new.company_id <> old.company_id
    or new.assessment_cycle_id <> old.assessment_cycle_id
    or new.assessment_template_id <> old.assessment_template_id
    or new.employee_id <> old.employee_id
    or new.evaluator_id <> old.evaluator_id then
    raise exception using errcode = '55000', message = 'ASSESSMENT_RESPONSE_ASSIGNMENT_IMMUTABLE';
  end if;

  if new.completed_at is distinct from old.completed_at
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '55000', message = 'ASSESSMENT_RESPONSE_FIELDS_IMMUTABLE';
  end if;

  if new.started_at is distinct from old.started_at then
    if not (
      old.started_at is null
      and new.started_at is not null
      and old.status = 'draft'
      and new.status = 'in_progress'
    ) then
      raise exception using errcode = '55000', message = 'ASSESSMENT_RESPONSE_START_TIME_FORBIDDEN';
    end if;
  end if;

  if not (
    new.status = old.status
    or (old.status = 'draft' and new.status in ('in_progress', 'submitted'))
    or (old.status = 'in_progress' and new.status = 'submitted')
  ) then
    raise exception using errcode = '55000', message = 'ASSESSMENT_RESPONSE_TRANSITION_FORBIDDEN';
  end if;

  if new.status not in ('draft', 'in_progress', 'submitted') then
    raise exception using errcode = '55000', message = 'ASSESSMENT_RESPONSE_TRANSITION_FORBIDDEN';
  end if;

  if new.status = 'submitted' and old.status <> 'submitted' then
    new.submitted_at := coalesce(new.submitted_at, now());
  elsif new.submitted_at is distinct from old.submitted_at then
    raise exception using errcode = '55000', message = 'ASSESSMENT_RESPONSE_SUBMISSION_TIME_FORBIDDEN';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.save_tenant_assessment_answer_v1(
  p_company_id uuid,
  p_assessment_response_id uuid,
  p_assessment_question_id uuid,
  p_answer_text text,
  p_answer_number numeric,
  p_answer_boolean boolean,
  p_score integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_response public.assessment_responses%rowtype;
  v_question public.assessment_questions%rowtype;
  v_actor_person_id uuid;
  v_answer public.assessment_answers%rowtype;
  v_answer_id uuid;
  v_answer_text text := nullif(btrim(p_answer_text), '');
  v_changed boolean := false;
  v_started boolean := false;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select * into v_response
  from public.assessment_responses response
  where response.id = p_assessment_response_id
    and response.company_id = p_company_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_RESPONSE_NOT_FOUND';
  end if;

  v_actor_person_id := public.current_person_id(p_company_id);
  if not public.is_company_member(p_company_id)
    or v_actor_person_id is null
    or v_actor_person_id <> v_response.evaluator_id then
    raise exception using errcode = '42501', message = 'ASSESSMENT_RESPONSE_WRITE_DENIED';
  end if;

  if v_response.status not in ('draft', 'in_progress') then
    raise exception using errcode = '55000', message = 'ASSESSMENT_RESPONSE_IMMUTABLE';
  end if;

  select question.* into v_question
  from public.assessment_questions question
  join public.assessment_sections section
    on section.id = question.assessment_section_id
    and section.company_id = question.company_id
  where question.id = p_assessment_question_id
    and question.company_id = p_company_id
    and question.active = true
    and question.deleted_at is null
    and section.assessment_template_id = v_response.assessment_template_id
    and section.active = true
    and section.deleted_at is null;

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_QUESTION_NOT_ANSWERABLE';
  end if;

  if num_nonnulls(v_answer_text, p_answer_number, p_answer_boolean, p_score) <> 1
    or (p_answer_text is not null and v_answer_text is null)
    or (v_answer_text is not null and char_length(v_answer_text) > 5000)
    or (
      v_question.question_type = 'scale'
      and (
        p_score is null
        or p_score < v_question.scale_min
        or p_score > v_question.scale_max
        or v_answer_text is not null
        or p_answer_number is not null
        or p_answer_boolean is not null
      )
    )
    or (
      v_question.question_type = 'yes_no'
      and (
        p_answer_boolean is null
        or v_answer_text is not null
        or p_answer_number is not null
        or p_score is not null
      )
    )
    or (
      v_question.question_type = 'text'
      and (
        v_answer_text is null
        or p_answer_number is not null
        or p_answer_boolean is not null
        or p_score is not null
      )
    )
    or (
      v_question.question_type = 'number'
      and (
        p_answer_number is null
        or p_answer_number < v_question.scale_min
        or p_answer_number > v_question.scale_max
        or v_answer_text is not null
        or p_answer_boolean is not null
        or p_score is not null
      )
    )
  then
    raise exception using errcode = '22023', message = 'ASSESSMENT_ANSWER_INVALID';
  end if;

  select * into v_answer
  from public.assessment_answers answer
  where answer.assessment_response_id = p_assessment_response_id
    and answer.assessment_question_id = p_assessment_question_id
  for update;

  if found then
    v_answer_id := v_answer.id;
    v_changed := v_answer.answer_text is distinct from v_answer_text
      or v_answer.answer_number is distinct from p_answer_number
      or v_answer.answer_boolean is distinct from p_answer_boolean
      or v_answer.score is distinct from p_score;

    if v_changed then
      update public.assessment_answers set
        answer_text = v_answer_text,
        answer_number = p_answer_number,
        answer_boolean = p_answer_boolean,
        score = p_score,
        updated_at = now()
      where id = v_answer.id;
    end if;
  else
    insert into public.assessment_answers (
      company_id, assessment_response_id, assessment_question_id,
      answer_text, answer_number, answer_boolean, score
    ) values (
      p_company_id, p_assessment_response_id, p_assessment_question_id,
      v_answer_text, p_answer_number, p_answer_boolean, p_score
    ) returning id into v_answer_id;
    v_changed := true;
  end if;

  if v_response.status = 'draft' then
    update public.assessment_responses set
      status = 'in_progress',
      started_at = coalesce(started_at, now())
    where id = p_assessment_response_id;
    v_started := true;
  end if;

  return jsonb_build_object(
    'status', case when v_changed or v_started then 'succeeded' else 'no_change' end,
    'assessmentAnswerId', v_answer_id,
    'assessmentResponseId', p_assessment_response_id,
    'assessmentQuestionId', p_assessment_question_id,
    'responseStatus', case when v_started then 'in_progress' else v_response.status end
  );
end;
$$;

create or replace function public.submit_tenant_assessment_response_v1(
  p_company_id uuid,
  p_assessment_response_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_response public.assessment_responses%rowtype;
  v_actor_person_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select * into v_response
  from public.assessment_responses response
  where response.id = p_assessment_response_id
    and response.company_id = p_company_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_RESPONSE_NOT_FOUND';
  end if;

  v_actor_person_id := public.current_person_id(p_company_id);
  if not public.is_company_member(p_company_id)
    or v_actor_person_id is null
    or v_actor_person_id <> v_response.evaluator_id then
    raise exception using errcode = '42501', message = 'ASSESSMENT_RESPONSE_WRITE_DENIED';
  end if;

  if v_response.status = 'submitted' then
    return jsonb_build_object(
      'status', 'already_submitted',
      'assessmentResponseId', p_assessment_response_id
    );
  end if;

  if v_response.status not in ('draft', 'in_progress') then
    raise exception using errcode = '55000', message = 'ASSESSMENT_RESPONSE_IMMUTABLE';
  end if;

  if exists (
    select 1
    from public.assessment_questions question
    join public.assessment_sections section
      on section.id = question.assessment_section_id
      and section.company_id = question.company_id
    where question.company_id = p_company_id
      and section.assessment_template_id = v_response.assessment_template_id
      and section.active = true
      and section.deleted_at is null
      and question.active = true
      and question.deleted_at is null
      and question.required = true
      and not exists (
        select 1
        from public.assessment_answers answer
        where answer.company_id = p_company_id
          and answer.assessment_response_id = p_assessment_response_id
          and answer.assessment_question_id = question.id
          and (
            (
              question.question_type = 'scale'
              and answer.score between question.scale_min and question.scale_max
              and num_nonnulls(
                answer.answer_text, answer.answer_number,
                answer.answer_boolean, answer.score
              ) = 1
            )
            or (
              question.question_type = 'yes_no'
              and answer.answer_boolean is not null
              and num_nonnulls(
                answer.answer_text, answer.answer_number,
                answer.answer_boolean, answer.score
              ) = 1
            )
            or (
              question.question_type = 'text'
              and nullif(btrim(answer.answer_text), '') is not null
              and char_length(btrim(answer.answer_text)) <= 5000
              and num_nonnulls(
                answer.answer_text, answer.answer_number,
                answer.answer_boolean, answer.score
              ) = 1
            )
            or (
              question.question_type = 'number'
              and answer.answer_number between question.scale_min and question.scale_max
              and num_nonnulls(
                answer.answer_text, answer.answer_number,
                answer.answer_boolean, answer.score
              ) = 1
            )
          )
      )
  ) then
    raise exception using errcode = '22023', message = 'ASSESSMENT_REQUIRED_ANSWERS_MISSING';
  end if;

  update public.assessment_responses set
    status = 'submitted',
    submitted_at = coalesce(submitted_at, now())
  where id = p_assessment_response_id;

  perform public.append_people_organization_activity(
    p_company_id,
    'assessment_response.submitted',
    'assessments',
    'Avaliação enviada',
    'As respostas da avaliação foram enviadas pelo avaliador designado.',
    'assessment_response',
    p_assessment_response_id,
    'employee',
    v_response.employee_id,
    jsonb_build_object(
      'assessmentResponseId', p_assessment_response_id,
      'assessmentCycleId', v_response.assessment_cycle_id,
      'assessmentTemplateId', v_response.assessment_template_id,
      'employeeId', v_response.employee_id,
      'evaluatorId', v_response.evaluator_id
    )
  );

  return jsonb_build_object(
    'status', 'succeeded',
    'assessmentResponseId', p_assessment_response_id
  );
end;
$$;

revoke insert, update, delete, truncate, trigger, maintain
  on table public.assessment_answers from public, anon, authenticated;
revoke insert, update, delete, truncate, trigger, maintain
  on table public.assessment_responses from public, anon, authenticated;

revoke all on function public.save_tenant_assessment_answer_v1(
  uuid, uuid, uuid, text, numeric, boolean, integer
) from public, anon, authenticated, service_role;
revoke all on function public.submit_tenant_assessment_response_v1(uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.save_tenant_assessment_answer_v1(
  uuid, uuid, uuid, text, numeric, boolean, integer
), public.submit_tenant_assessment_response_v1(uuid, uuid)
to authenticated;

notify pgrst, 'reload schema';
