-- Assessment Question -> Company Competency trusted relationship and mutations.
--
-- Questions may remain generic. When a competency is newly assigned it must be
-- active and belong to the question tenant. Existing links survive logical
-- competency archival and can still be preserved while other fields are edited.

alter table public.assessment_questions
  drop constraint if exists assessment_questions_competency_id_fkey;

alter table public.assessment_questions
  add constraint assessment_questions_competency_company_fkey
  foreign key (competency_id, company_id)
  references public.competencies(id, company_id)
  on delete restrict;

create index if not exists assessment_questions_competency_company_idx
  on public.assessment_questions(competency_id, company_id)
  where competency_id is not null;

revoke insert, update, delete, truncate, trigger, maintain
  on table public.assessment_questions from anon, authenticated;

create or replace function public.create_tenant_assessment_question_v1(
  p_company_id uuid,
  p_assessment_section_id uuid,
  p_competency_id uuid,
  p_code text,
  p_question text,
  p_help_text text,
  p_question_type text,
  p_scale_min integer,
  p_scale_max integer,
  p_weight numeric,
  p_display_order integer,
  p_required boolean,
  p_active boolean
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_code text := nullif(btrim(p_code), '');
  v_question text := btrim(p_question);
  v_help_text text := nullif(btrim(p_help_text), '');
begin
  perform public.require_people_organization_mutator(p_company_id);

  if v_question is null or char_length(v_question) not between 5 and 500
    or (v_code is not null and char_length(v_code) > 30)
    or (v_help_text is not null and char_length(v_help_text) > 1000)
    or p_question_type not in ('scale', 'yes_no', 'text', 'number')
    or p_scale_min is null or p_scale_min < 0
    or p_scale_max is null or p_scale_max <= p_scale_min
    or p_weight is null or p_weight <= 0 or p_weight > 100
    or p_display_order is null or p_display_order < 0
    or p_required is null or p_active is null
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  if not exists (
    select 1 from public.assessment_sections s
    join public.assessment_templates t
      on t.id = s.assessment_template_id
     and (t.company_id = p_company_id or t.company_id is null)
    where s.id = p_assessment_section_id
      and s.company_id = p_company_id
      and s.deleted_at is null
  ) then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_SECTION_NOT_FOUND';
  end if;

  if p_competency_id is not null and not exists (
    select 1 from public.competencies c
    where c.id = p_competency_id
      and c.company_id = p_company_id
      and c.active = true
  ) then
    raise exception using errcode = 'P0002', message = 'COMPETENCY_NOT_FOUND';
  end if;

  begin
    insert into public.assessment_questions (
      company_id, assessment_section_id, competency_id, code, question,
      help_text, question_type, scale_min, scale_max, weight, display_order,
      required, active
    ) values (
      p_company_id, p_assessment_section_id, p_competency_id, v_code,
      v_question, v_help_text, p_question_type, p_scale_min, p_scale_max,
      p_weight, p_display_order, p_required, p_active
    ) returning id into v_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  perform public.append_people_organization_activity(
    p_company_id, 'assessment_question.created', 'assessments',
    'Pergunta de avaliação criada',
    'Uma pergunta foi adicionada a um modelo de avaliação.',
    'assessment_question', v_id, null, null,
    jsonb_build_object(
      'assessmentQuestionId', v_id,
      'assessmentSectionId', p_assessment_section_id,
      'competencyId', p_competency_id
    )
  );

  return jsonb_build_object('status', 'succeeded', 'assessmentQuestionId', v_id);
end;
$$;

create or replace function public.update_tenant_assessment_question_v1(
  p_company_id uuid,
  p_assessment_question_id uuid,
  p_assessment_section_id uuid,
  p_competency_id uuid,
  p_code text,
  p_question text,
  p_help_text text,
  p_question_type text,
  p_scale_min integer,
  p_scale_max integer,
  p_weight numeric,
  p_display_order integer,
  p_required boolean,
  p_active boolean
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.assessment_questions%rowtype;
  v_code text := nullif(btrim(p_code), '');
  v_question text := btrim(p_question);
  v_help_text text := nullif(btrim(p_help_text), '');
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current from public.assessment_questions
  where id = p_assessment_question_id
    and company_id = p_company_id
    and deleted_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_QUESTION_NOT_FOUND';
  end if;

  if v_question is null or char_length(v_question) not between 5 and 500
    or (v_code is not null and char_length(v_code) > 30)
    or (v_help_text is not null and char_length(v_help_text) > 1000)
    or p_question_type not in ('scale', 'yes_no', 'text', 'number')
    or p_scale_min is null or p_scale_min < 0
    or p_scale_max is null or p_scale_max <= p_scale_min
    or p_weight is null or p_weight <= 0 or p_weight > 100
    or p_display_order is null or p_display_order < 0
    or p_required is null or p_active is null
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  if not exists (
    select 1 from public.assessment_sections s
    join public.assessment_templates t
      on t.id = s.assessment_template_id
     and (t.company_id = p_company_id or t.company_id is null)
    where s.id = p_assessment_section_id
      and s.company_id = p_company_id
      and s.deleted_at is null
  ) then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_SECTION_NOT_FOUND';
  end if;

  if p_competency_id is distinct from v_current.competency_id
    and p_competency_id is not null
    and not exists (
      select 1 from public.competencies c
      where c.id = p_competency_id
        and c.company_id = p_company_id
        and c.active = true
    )
  then
    raise exception using errcode = 'P0002', message = 'COMPETENCY_NOT_FOUND';
  end if;

  begin
    update public.assessment_questions set
      assessment_section_id = p_assessment_section_id,
      competency_id = p_competency_id,
      code = v_code,
      question = v_question,
      help_text = v_help_text,
      question_type = p_question_type,
      scale_min = p_scale_min,
      scale_max = p_scale_max,
      weight = p_weight,
      display_order = p_display_order,
      required = p_required,
      active = p_active,
      updated_at = now()
    where id = p_assessment_question_id and company_id = p_company_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  perform public.append_people_organization_activity(
    p_company_id, 'assessment_question.updated', 'assessments',
    'Pergunta de avaliação atualizada',
    'Uma pergunta de um modelo de avaliação foi atualizada.',
    'assessment_question', p_assessment_question_id, null, null,
    jsonb_build_object(
      'assessmentQuestionId', p_assessment_question_id,
      'assessmentSectionId', p_assessment_section_id,
      'competencyId', p_competency_id,
      'previousCompetencyId', v_current.competency_id
    )
  );

  return jsonb_build_object(
    'status', 'succeeded', 'assessmentQuestionId', p_assessment_question_id
  );
end;
$$;

create or replace function public.archive_tenant_assessment_question_v1(
  p_company_id uuid,
  p_assessment_question_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.assessment_questions%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current from public.assessment_questions
  where id = p_assessment_question_id and company_id = p_company_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_QUESTION_NOT_FOUND';
  end if;
  if v_current.deleted_at is not null then
    return jsonb_build_object(
      'status', 'already_archived',
      'assessmentQuestionId', p_assessment_question_id
    );
  end if;

  update public.assessment_questions
  set active = false, deleted_at = now(), updated_at = now()
  where id = p_assessment_question_id and company_id = p_company_id;

  perform public.append_people_organization_activity(
    p_company_id, 'assessment_question.archived', 'assessments',
    'Pergunta de avaliação arquivada',
    'Uma pergunta foi removida de um modelo de avaliação.',
    'assessment_question', p_assessment_question_id, null, null,
    jsonb_build_object(
      'assessmentQuestionId', p_assessment_question_id,
      'assessmentSectionId', v_current.assessment_section_id,
      'competencyId', v_current.competency_id
    )
  );

  return jsonb_build_object(
    'status', 'succeeded', 'assessmentQuestionId', p_assessment_question_id
  );
end;
$$;

revoke all on function public.create_tenant_assessment_question_v1(
  uuid, uuid, uuid, text, text, text, text, integer, integer, numeric,
  integer, boolean, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_assessment_question_v1(
  uuid, uuid, uuid, uuid, text, text, text, text, integer, integer, numeric,
  integer, boolean, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_assessment_question_v1(uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.create_tenant_assessment_question_v1(
  uuid, uuid, uuid, text, text, text, text, integer, integer, numeric,
  integer, boolean, boolean
), public.update_tenant_assessment_question_v1(
  uuid, uuid, uuid, uuid, text, text, text, text, integer, integer, numeric,
  integer, boolean, boolean
), public.archive_tenant_assessment_question_v1(uuid, uuid)
to authenticated;

-- Extend the established trusted structure reads with competency context. The
-- left join intentionally includes inactive competencies so historical links
-- remain understandable after catalog archival.
drop function if exists public.get_tenant_assessment_template_structure_v1(uuid, uuid);
create function public.get_tenant_assessment_template_structure_v1(
  p_company_id uuid, p_template_id uuid
)
returns table(
  record_type text, record_id uuid, parent_id uuid, name text,
  description text, instructions text, assessment_type text, status text,
  icon text, color text, weight numeric, display_order integer, question text,
  help_text text, question_type text, scale_min integer, scale_max integer,
  required boolean, active boolean, competency_id uuid, competency_name text
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED';
  end if;
  if not public.has_company_role(p_company_id,array['owner','admin','hr']) then
    raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED';
  end if;
  return query select rows.* from (
    select 'template'::text,t.id,null::uuid,t.name,t.description,t.instructions,
      t.type,t.status,null::text,null::text,null::numeric,null::integer,null::text,
      null::text,null::text,null::integer,null::integer,null::boolean,t.active,
      null::uuid,null::text
    from public.assessment_templates t
    where t.company_id=p_company_id and t.id=p_template_id and t.deleted_at is null
    union all
    select 'section',s.id,s.assessment_template_id,s.name,s.description,null,null,
      null,s.icon,s.color,s.weight,s.display_order,null,null,null,null,null,null,
      s.active,null::uuid,null::text
    from public.assessment_sections s join public.assessment_templates t
      on t.id=s.assessment_template_id and t.company_id=s.company_id
    where s.company_id=p_company_id and s.assessment_template_id=p_template_id
      and s.deleted_at is null and t.deleted_at is null
    union all
    select 'question',q.id,q.assessment_section_id,null,null,null,null,null,null,null,
      q.weight,q.display_order,q.question,q.help_text,q.question_type,q.scale_min,
      q.scale_max,q.required,q.active,q.competency_id,c.name
    from public.assessment_questions q join public.assessment_sections s
      on s.id=q.assessment_section_id and s.company_id=q.company_id
    join public.assessment_templates t
      on t.id=s.assessment_template_id and t.company_id=s.company_id
    left join public.competencies c
      on c.id=q.competency_id and c.company_id=q.company_id
    where q.company_id=p_company_id and t.id=p_template_id and q.deleted_at is null
      and s.deleted_at is null and t.deleted_at is null
  ) rows order by 1,12,2;
end; $$;

drop function if exists public.get_assessment_evaluator_workspace_v1(uuid, uuid);
create function public.get_assessment_evaluator_workspace_v1(
  p_company_id uuid, p_response_id uuid
)
returns table(
  record_type text, record_id uuid, parent_id uuid, template_id uuid,
  cycle_id uuid, employee_id uuid, evaluator_id uuid, status text, name text,
  description text, instructions text, assessment_type text, icon text,
  color text, weight numeric, display_order integer, question text,
  help_text text, question_type text, scale_min integer, scale_max integer,
  required boolean, active boolean, started_at timestamptz,
  completed_at timestamptz, submitted_at timestamptz, competency_id uuid,
  competency_name text
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_template_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED';
  end if;
  select r.assessment_template_id into v_template_id
  from public.assessment_responses r
  where r.company_id=p_company_id and r.id=p_response_id
    and r.evaluator_id=public.current_person_id(p_company_id)
    and public.is_company_member(p_company_id);
  if v_template_id is null then return; end if;
  return query select rows.* from (
    select 'response'::text,r.id,null::uuid,r.assessment_template_id,
      r.assessment_cycle_id,r.employee_id,r.evaluator_id,r.status,null::text,
      null::text,null::text,null::text,null::text,null::text,null::numeric,
      null::integer,null::text,null::text,null::text,null::integer,null::integer,
      null::boolean,null::boolean,r.started_at,r.completed_at,r.submitted_at,
      null::uuid,null::text
    from public.assessment_responses r
    where r.company_id=p_company_id and r.id=p_response_id
    union all
    select 'template',t.id,null,t.id,null,null,null,t.status,t.name,t.description,
      t.instructions,t.type,null,null,null,null,null,null,null,null,null,null,t.active,
      null,null,null,null::uuid,null::text
    from public.assessment_templates t
    where t.company_id=p_company_id and t.id=v_template_id
    union all
    select 'section',s.id,s.assessment_template_id,v_template_id,null,null,null,null,
      s.name,s.description,null,null,s.icon,s.color,s.weight,s.display_order,null,
      null,null,null,null,null,s.active,null,null,null,null::uuid,null::text
    from public.assessment_sections s
    where s.company_id=p_company_id and s.assessment_template_id=v_template_id
      and s.deleted_at is null
    union all
    select 'question',q.id,q.assessment_section_id,v_template_id,null,null,null,null,
      null,null,null,null,null,null,q.weight,q.display_order,q.question,q.help_text,
      q.question_type,q.scale_min,q.scale_max,q.required,q.active,null,null,null,
      q.competency_id,c.name
    from public.assessment_questions q join public.assessment_sections s
      on s.id=q.assessment_section_id and s.company_id=q.company_id
    left join public.competencies c
      on c.id=q.competency_id and c.company_id=q.company_id
    where q.company_id=p_company_id and s.assessment_template_id=v_template_id
      and q.deleted_at is null and s.deleted_at is null
  ) rows order by 1,16,2;
end; $$;

revoke all on function public.get_tenant_assessment_template_structure_v1(uuid,uuid),
  public.get_assessment_evaluator_workspace_v1(uuid,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_tenant_assessment_template_structure_v1(uuid,uuid),
  public.get_assessment_evaluator_workspace_v1(uuid,uuid)
  to authenticated;

notify pgrst, 'reload schema';
