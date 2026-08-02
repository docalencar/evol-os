-- PD-016 / ADR-0010 — Assessment Authorization

alter table public.assessment_cycles
  add column if not exists assessment_visibility text
  not null
  default 'none';

alter table public.assessment_cycles
  drop constraint if exists assessment_cycles_visibility_check;

alter table public.assessment_cycles
  add constraint assessment_cycles_visibility_check
  check (
    assessment_visibility in (
      'none',
      'score',
      'score_and_competencies',
      'score_and_comments',
      'full'
    )
  );

create or replace function public.audit_secure_administrative_read(
  p_company_id uuid,
  p_module text,
  p_entity_type text,
  p_entity_id uuid,
  p_operation text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.has_company_role(
    p_company_id,
    array['owner', 'admin', 'hr']
  ) then
    raise exception 'ADMINISTRATIVE_READ_FORBIDDEN';
  end if;

  if p_reason is null
    or p_reason !~ '^[a-z][a-z0-9_]{2,79}$' then
    raise exception 'ADMINISTRATIVE_READ_REASON_REQUIRED';
  end if;

  insert into public.activity_events (
    company_id,
    activity_type,
    module,
    title,
    actor_type,
    actor_id,
    entity_type,
    entity_id,
    visibility,
    metadata
  ) values (
    p_company_id,
    p_module || '.administrative_read',
    p_module,
    'Leitura administrativa de dado sensível',
    'user',
    auth.uid(),
    p_entity_type,
    p_entity_id,
    'restricted',
    jsonb_build_object(
      'operation', p_operation,
      'reason', p_reason
    )
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.audit_secure_administrative_read(
  uuid, text, text, uuid, text, text
) from public;

create or replace function public.read_assessment_administratively(
  p_company_id uuid,
  p_scope text,
  p_scope_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response_ids uuid[];
  v_result jsonb;
begin
  if p_scope not in ('response', 'cycle', 'employee') then
    raise exception 'ASSESSMENT_ADMINISTRATIVE_SCOPE_INVALID';
  end if;

  perform public.audit_secure_administrative_read(
    p_company_id,
    'assessments',
    'assessment_' || p_scope,
    p_scope_id,
    'read_' || p_scope,
    p_reason
  );

  select coalesce(array_agg(ar.id), array[]::uuid[])
  into v_response_ids
  from public.assessment_responses ar
  where ar.company_id = p_company_id
    and (
      (p_scope = 'response' and ar.id = p_scope_id)
      or (p_scope = 'cycle' and ar.assessment_cycle_id = p_scope_id)
      or (p_scope = 'employee' and ar.employee_id = p_scope_id)
    );

  select jsonb_build_object(
    'responses', coalesce((
      select jsonb_agg(
        to_jsonb(ar) || jsonb_build_object(
          'employee', jsonb_build_object(
            'id', employee.id,
            'full_name', employee.full_name,
            'email', employee.email
          ),
          'evaluator', jsonb_build_object(
            'id', evaluator.id,
            'full_name', evaluator.full_name
          )
        )
        order by ar.created_at
      )
      from public.assessment_responses ar
      join public.people employee on employee.id = ar.employee_id
      join public.people evaluator on evaluator.id = ar.evaluator_id
      where ar.id = any(v_response_ids)
    ), '[]'::jsonb),
    'answers', coalesce((
      select jsonb_agg(to_jsonb(aa) order by aa.created_at)
      from public.assessment_answers aa
      where aa.company_id = p_company_id
        and aa.assessment_response_id = any(v_response_ids)
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.read_assessment_administratively(
  uuid, text, uuid, text
) from public;
grant execute on function public.read_assessment_administratively(
  uuid, text, uuid, text
) to authenticated;

create or replace function public.read_assessment_result_for_evaluatee(
  p_company_id uuid,
  p_assessment_response_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response_id uuid;
  v_response_status text;
  v_visibility text;
  v_answers jsonb;
  v_competencies jsonb;
  v_overall_score numeric;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select ar.id, ar.status, ac.assessment_visibility
  into v_response_id, v_response_status, v_visibility
  from public.assessment_responses ar
  join public.assessment_cycles ac
    on ac.id = ar.assessment_cycle_id
    and ac.company_id = ar.company_id
  where ar.company_id = p_company_id
    and ar.id = p_assessment_response_id
    and ar.employee_id = public.current_person_id(p_company_id)
    and public.is_company_member(p_company_id)
    and ar.status in ('submitted', 'completed');

  if not found or v_visibility = 'none' then
    raise exception 'ASSESSMENT_RESULT_NOT_VISIBLE';
  end if;

  select avg(aa.score)
  into v_overall_score
  from public.assessment_answers aa
  where aa.company_id = p_company_id
    and aa.assessment_response_id = p_assessment_response_id
    and aa.score is not null;

  if v_visibility in ('score_and_competencies', 'full') then
    select coalesce(jsonb_agg(row_data order by section_name), '[]'::jsonb)
    into v_competencies
    from (
      select jsonb_build_object(
        'sectionId', section_scores.section_id,
        'sectionName', section_scores.section_name,
        'averageScore', avg(section_scores.score)
      ) as row_data,
      section_scores.section_name
      from (
        select ase.id as section_id, ase.name as section_name, aa.score
        from public.assessment_answers aa
        join public.assessment_questions aq
          on aq.id = aa.assessment_question_id
        join public.assessment_sections ase
          on ase.id = aq.assessment_section_id
        where aa.company_id = p_company_id
          and aa.assessment_response_id = p_assessment_response_id
          and aa.score is not null
      ) section_scores
      group by section_scores.section_id, section_scores.section_name
    ) competency_rows;
  else
    v_competencies := '[]'::jsonb;
  end if;

  if v_visibility = 'full' then
    select coalesce(jsonb_agg(to_jsonb(aa) order by aa.created_at), '[]'::jsonb)
    into v_answers
    from public.assessment_answers aa
    where aa.company_id = p_company_id
      and aa.assessment_response_id = p_assessment_response_id;
  elsif v_visibility = 'score_and_comments' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'assessmentQuestionId', aa.assessment_question_id,
      'score', aa.score,
      'comment', aa.answer_text
    ) order by aa.created_at), '[]'::jsonb)
    into v_answers
    from public.assessment_answers aa
    where aa.company_id = p_company_id
      and aa.assessment_response_id = p_assessment_response_id;
  else
    v_answers := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'assessmentResponseId', v_response_id,
    'status', v_response_status,
    'visibility', v_visibility,
    'overallScore', v_overall_score,
    'competencies', v_competencies,
    'answers', v_answers
  );
end;
$$;

revoke all on function public.read_assessment_result_for_evaluatee(
  uuid, uuid
) from public;
grant execute on function public.read_assessment_result_for_evaluatee(
  uuid, uuid
) to authenticated;

grant select, insert, update
on public.assessment_responses
to authenticated;

grant select, insert, update
on public.assessment_answers
to authenticated;

drop policy if exists "members can read assessment responses"
  on public.assessment_responses;
drop policy if exists "admins and hr create assessment responses"
  on public.assessment_responses;
drop policy if exists "members update assessment responses"
  on public.assessment_responses;
drop policy if exists "administrators create assessment responses"
  on public.assessment_responses;
drop policy if exists "evaluators read own assessment responses"
  on public.assessment_responses;
drop policy if exists "evaluators update open assessment responses"
  on public.assessment_responses;

create policy "administrators create assessment responses"
on public.assessment_responses
for insert
with check (
  public.has_company_role(company_id, array['owner', 'admin', 'hr'])
);

create policy "evaluators read own assessment responses"
on public.assessment_responses
for select
using (
  public.is_company_member(company_id)
  and evaluator_id = public.current_person_id(company_id)
);

create policy "evaluators update open assessment responses"
on public.assessment_responses
for update
using (
  public.is_company_member(company_id)
  and evaluator_id = public.current_person_id(company_id)
  and status in ('draft', 'in_progress')
)
with check (
  public.is_company_member(company_id)
  and evaluator_id = public.current_person_id(company_id)
  and status in ('draft', 'in_progress', 'submitted')
);

drop policy if exists "members can read assessment answers"
  on public.assessment_answers;
drop policy if exists "members create assessment answers"
  on public.assessment_answers;
drop policy if exists "members update assessment answers"
  on public.assessment_answers;
drop policy if exists "related managers can manage assessment answers"
  on public.assessment_answers;
drop policy if exists "evaluators read own assessment answers"
  on public.assessment_answers;
drop policy if exists "evaluators create own open assessment answers"
  on public.assessment_answers;
drop policy if exists "evaluators update own open assessment answers"
  on public.assessment_answers;

create policy "evaluators read own assessment answers"
on public.assessment_answers
for select
using (
  exists (
    select 1
    from public.assessment_responses ar
    where ar.id = assessment_response_id
      and ar.company_id = assessment_answers.company_id
      and public.is_company_member(ar.company_id)
      and ar.evaluator_id = public.current_person_id(ar.company_id)
  )
);

create policy "evaluators create own open assessment answers"
on public.assessment_answers
for insert
with check (
  exists (
    select 1
    from public.assessment_responses ar
    where ar.id = assessment_response_id
      and ar.company_id = assessment_answers.company_id
      and public.is_company_member(ar.company_id)
      and ar.evaluator_id = public.current_person_id(ar.company_id)
      and ar.status in ('draft', 'in_progress')
  )
);

create policy "evaluators update own open assessment answers"
on public.assessment_answers
for update
using (
  exists (
    select 1
    from public.assessment_responses ar
    where ar.id = assessment_response_id
      and ar.company_id = assessment_answers.company_id
      and public.is_company_member(ar.company_id)
      and ar.evaluator_id = public.current_person_id(ar.company_id)
      and ar.status in ('draft', 'in_progress')
  )
)
with check (
  exists (
    select 1
    from public.assessment_responses ar
    where ar.id = assessment_response_id
      and ar.company_id = assessment_answers.company_id
      and public.is_company_member(ar.company_id)
      and ar.evaluator_id = public.current_person_id(ar.company_id)
      and ar.status in ('draft', 'in_progress')
  )
);

create or replace function public.protect_assessment_response_immutability()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status in ('submitted', 'completed') then
    raise exception 'ASSESSMENT_RESPONSE_IMMUTABLE';
  end if;

  if new.company_id <> old.company_id
    or new.assessment_cycle_id <> old.assessment_cycle_id
    or new.assessment_template_id <> old.assessment_template_id
    or new.employee_id <> old.employee_id
    or new.evaluator_id <> old.evaluator_id then
    raise exception 'ASSESSMENT_RESPONSE_ASSIGNMENT_IMMUTABLE';
  end if;

  if new.started_at is distinct from old.started_at
    or new.completed_at is distinct from old.completed_at
    or new.created_at is distinct from old.created_at then
    raise exception 'ASSESSMENT_RESPONSE_FIELDS_IMMUTABLE';
  end if;

  if not (
    new.status = old.status
    or (old.status = 'draft' and new.status in ('in_progress', 'submitted'))
    or (old.status = 'in_progress' and new.status = 'submitted')
  ) then
    raise exception 'ASSESSMENT_RESPONSE_TRANSITION_FORBIDDEN';
  end if;

  if new.status not in ('draft', 'in_progress', 'submitted') then
    raise exception 'ASSESSMENT_RESPONSE_TRANSITION_FORBIDDEN';
  end if;

  if new.status = 'submitted' and old.status <> 'submitted' then
    new.submitted_at := coalesce(new.submitted_at, now());
  elsif new.submitted_at is distinct from old.submitted_at then
    raise exception 'ASSESSMENT_RESPONSE_SUBMISSION_TIME_FORBIDDEN';
  end if;

  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists protect_assessment_response_immutability
on public.assessment_responses;

create trigger protect_assessment_response_immutability
before update on public.assessment_responses
for each row
execute function public.protect_assessment_response_immutability();

notify pgrst, 'reload schema';
