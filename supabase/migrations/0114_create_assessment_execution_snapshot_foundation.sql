-- Immutable Assessment execution structure captured at first effective Response generation.
-- Authoring and preview remain live; execution, validation and historical reads use snapshots.

alter table public.assessment_cycles
  add constraint assessment_cycles_id_company_id_key unique (id, company_id);
alter table public.assessment_templates
  add constraint assessment_templates_id_company_id_key unique (id, company_id);
alter table public.assessment_sections
  add constraint assessment_sections_id_company_id_key unique (id, company_id);
alter table public.assessment_questions
  add constraint assessment_questions_id_company_id_key unique (id, company_id);

create table public.assessment_execution_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assessment_cycle_id uuid not null,
  source_assessment_template_id uuid not null,
  template_name text not null,
  template_description text,
  template_instructions text,
  template_type text not null,
  capture_origin text not null,
  captured_at timestamptz not null default now(),
  constraint assessment_execution_snapshots_origin_check
    check (capture_origin in ('response_generation','legacy_backfill_current_state')),
  constraint assessment_execution_snapshots_template_type_check
    check (template_type in ('experience','monthly','quarterly','semester','annual','360','leadership')),
  constraint assessment_execution_snapshots_id_company_key unique (id, company_id),
  constraint assessment_execution_snapshots_cycle_company_key
    unique (assessment_cycle_id, company_id),
  constraint assessment_execution_snapshots_id_cycle_company_key
    unique (id, assessment_cycle_id, company_id),
  constraint assessment_execution_snapshots_cycle_company_fkey
    foreign key (assessment_cycle_id, company_id)
    references public.assessment_cycles(id, company_id) on delete restrict,
  constraint assessment_execution_snapshots_template_company_fkey
    foreign key (source_assessment_template_id, company_id)
    references public.assessment_templates(id, company_id) on delete restrict
);

create table public.assessment_execution_snapshot_sections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assessment_execution_snapshot_id uuid not null,
  source_assessment_section_id uuid not null,
  code text,
  name text not null,
  description text,
  weight numeric(5,2) not null,
  display_order integer not null,
  active_at_capture boolean not null,
  constraint assessment_execution_snapshot_sections_weight_check
    check (weight > 0 and weight <= 100),
  constraint assessment_execution_snapshot_sections_order_check
    check (display_order >= 0),
  constraint assessment_execution_snapshot_sections_id_company_key unique (id, company_id),
  constraint assessment_execution_snapshot_sections_id_snapshot_company_key
    unique (id, assessment_execution_snapshot_id, company_id),
  constraint assessment_execution_snapshot_sections_source_key
    unique (assessment_execution_snapshot_id, source_assessment_section_id),
  constraint assessment_execution_snapshot_sections_snapshot_company_fkey
    foreign key (assessment_execution_snapshot_id, company_id)
    references public.assessment_execution_snapshots(id, company_id) on delete restrict,
  constraint assessment_execution_snapshot_sections_source_company_fkey
    foreign key (source_assessment_section_id, company_id)
    references public.assessment_sections(id, company_id) on delete restrict
);

create table public.assessment_execution_snapshot_questions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assessment_execution_snapshot_id uuid not null,
  assessment_execution_snapshot_section_id uuid not null,
  source_assessment_question_id uuid not null,
  source_competency_id uuid,
  competency_name text,
  code text,
  question text not null,
  help_text text,
  question_type text not null,
  required boolean not null,
  weight numeric(5,2) not null,
  display_order integer not null,
  scale_min integer not null,
  scale_max integer not null,
  active_at_capture boolean not null,
  constraint assessment_execution_snapshot_questions_type_check
    check (question_type in ('scale','yes_no','text','number')),
  constraint assessment_execution_snapshot_questions_scale_check
    check (scale_min >= 0 and scale_max > scale_min),
  constraint assessment_execution_snapshot_questions_weight_check
    check (weight > 0 and weight <= 100),
  constraint assessment_execution_snapshot_questions_order_check
    check (display_order >= 0),
  constraint assessment_execution_snapshot_questions_competency_name_check
    check ((source_competency_id is null) = (competency_name is null)),
  constraint assessment_execution_snapshot_questions_id_company_key unique (id, company_id),
  constraint assessment_execution_snapshot_questions_id_snapshot_company_key
    unique (id, assessment_execution_snapshot_id, company_id),
  constraint assessment_execution_snapshot_questions_source_key
    unique (assessment_execution_snapshot_id, source_assessment_question_id),
  constraint assessment_execution_snapshot_questions_snapshot_company_fkey
    foreign key (assessment_execution_snapshot_id, company_id)
    references public.assessment_execution_snapshots(id, company_id) on delete restrict,
  constraint assessment_execution_snapshot_questions_section_snapshot_company_fkey
    foreign key (
      assessment_execution_snapshot_section_id,
      assessment_execution_snapshot_id,
      company_id
    ) references public.assessment_execution_snapshot_sections(
      id, assessment_execution_snapshot_id, company_id
    ) on delete restrict,
  constraint assessment_execution_snapshot_questions_source_company_fkey
    foreign key (source_assessment_question_id, company_id)
    references public.assessment_questions(id, company_id) on delete restrict,
  constraint assessment_execution_snapshot_questions_competency_company_fkey
    foreign key (source_competency_id, company_id)
    references public.competencies(id, company_id) on delete restrict
);

create index assessment_execution_snapshot_sections_order_idx
  on public.assessment_execution_snapshot_sections(
    assessment_execution_snapshot_id, display_order, id
  );
create index assessment_execution_snapshot_questions_order_idx
  on public.assessment_execution_snapshot_questions(
    assessment_execution_snapshot_section_id, display_order, id
  );
create index assessment_execution_snapshot_questions_competency_idx
  on public.assessment_execution_snapshot_questions(company_id, source_competency_id)
  where source_competency_id is not null;

alter table public.assessment_responses
  add column assessment_execution_snapshot_id uuid;
alter table public.assessment_responses
  add constraint assessment_responses_id_snapshot_company_key
  unique (id, assessment_execution_snapshot_id, company_id);

alter table public.assessment_answers
  add column assessment_execution_snapshot_id uuid,
  add column assessment_execution_snapshot_question_id uuid;

-- Fail closed before reconstructing legacy execution state.
do $$
begin
  if exists (
    select 1 from public.assessment_responses response
    left join public.assessment_cycles cycle
      on cycle.id=response.assessment_cycle_id and cycle.company_id=response.company_id
    left join public.assessment_templates template
      on template.id=response.assessment_template_id and template.company_id=response.company_id
    where cycle.id is null or template.id is null
      or cycle.assessment_template_id is distinct from response.assessment_template_id
  ) then
    raise exception using errcode='23514',message='ASSESSMENT_SNAPSHOT_LEGACY_RESPONSE_INCONSISTENT';
  end if;

  if exists (
    select 1 from public.assessment_responses response
    group by response.company_id,response.assessment_cycle_id
    having count(distinct response.assessment_template_id) <> 1
  ) then
    raise exception using errcode='23514',message='ASSESSMENT_SNAPSHOT_LEGACY_CYCLE_MODELS_INCONSISTENT';
  end if;

  if exists (
    select 1 from public.assessment_answers answer
    join public.assessment_responses response on response.id=answer.assessment_response_id
    left join public.assessment_questions question
      on question.id=answer.assessment_question_id and question.company_id=answer.company_id
    left join public.assessment_sections section
      on section.id=question.assessment_section_id and section.company_id=question.company_id
    where answer.assessment_response_id is not null
      and (answer.company_id is distinct from response.company_id
        or question.id is null or section.id is null
        or section.assessment_template_id is distinct from response.assessment_template_id)
  ) then
    raise exception using errcode='23514',message='ASSESSMENT_SNAPSHOT_LEGACY_ANSWER_UNRECONCILABLE';
  end if;
end;
$$;

insert into public.assessment_execution_snapshots (
  company_id, assessment_cycle_id, source_assessment_template_id,
  template_name, template_description, template_instructions, template_type,
  capture_origin
)
select distinct response.company_id,response.assessment_cycle_id,response.assessment_template_id,
  template.name,template.description,template.instructions,template.type,
  'legacy_backfill_current_state'
from public.assessment_responses response
join public.assessment_templates template
  on template.id=response.assessment_template_id and template.company_id=response.company_id;

insert into public.assessment_execution_snapshot_sections (
  company_id, assessment_execution_snapshot_id, source_assessment_section_id,
  code, name, description, weight, display_order, active_at_capture
)
select distinct snapshot.company_id,snapshot.id,section.id,section.code,section.name,
  section.description,section.weight,section.display_order,
  section.active and section.deleted_at is null
from public.assessment_execution_snapshots snapshot
join public.assessment_sections section
  on section.company_id=snapshot.company_id
  and section.assessment_template_id=snapshot.source_assessment_template_id
where section.deleted_at is null or exists (
  select 1 from public.assessment_answers answer
  join public.assessment_responses response on response.id=answer.assessment_response_id
  join public.assessment_questions question on question.id=answer.assessment_question_id
  where response.assessment_cycle_id=snapshot.assessment_cycle_id
    and response.company_id=snapshot.company_id
    and question.assessment_section_id=section.id
);

insert into public.assessment_execution_snapshot_questions (
  company_id, assessment_execution_snapshot_id,
  assessment_execution_snapshot_section_id, source_assessment_question_id,
  source_competency_id, competency_name, code, question, help_text,
  question_type, required, weight, display_order, scale_min, scale_max,
  active_at_capture
)
select snapshot.company_id,snapshot.id,snapshot_section.id,question.id,
  question.competency_id,competency.name,question.code,question.question,
  question.help_text,question.question_type,question.required,question.weight,
  question.display_order,question.scale_min,question.scale_max,
  question.active and question.deleted_at is null
    and section.active and section.deleted_at is null
from public.assessment_execution_snapshots snapshot
join public.assessment_execution_snapshot_sections snapshot_section
  on snapshot_section.assessment_execution_snapshot_id=snapshot.id
  and snapshot_section.company_id=snapshot.company_id
join public.assessment_sections section
  on section.id=snapshot_section.source_assessment_section_id
  and section.company_id=snapshot.company_id
join public.assessment_questions question
  on question.assessment_section_id=section.id and question.company_id=section.company_id
left join public.competencies competency
  on competency.id=question.competency_id and competency.company_id=question.company_id
where question.deleted_at is null or exists (
  select 1 from public.assessment_answers answer
  join public.assessment_responses response on response.id=answer.assessment_response_id
  where response.assessment_cycle_id=snapshot.assessment_cycle_id
    and response.company_id=snapshot.company_id
  and answer.assessment_question_id=question.id
);

do $$
begin
  if exists (
    select 1 from public.assessment_execution_snapshots snapshot
    where not exists (
      select 1 from public.assessment_execution_snapshot_questions question
      join public.assessment_execution_snapshot_sections section
        on section.id=question.assessment_execution_snapshot_section_id
        and section.assessment_execution_snapshot_id=question.assessment_execution_snapshot_id
        and section.company_id=question.company_id
      where question.assessment_execution_snapshot_id=snapshot.id
        and question.company_id=snapshot.company_id
        and question.active_at_capture and section.active_at_capture
    )
  ) then
    raise exception using errcode='23514',message='ASSESSMENT_SNAPSHOT_LEGACY_STRUCTURE_UNRECONSTRUCTIBLE';
  end if;
end;
$$;

alter table public.assessment_responses
  disable trigger protect_assessment_response_immutability;

update public.assessment_responses response
set assessment_execution_snapshot_id=snapshot.id
from public.assessment_execution_snapshots snapshot
where snapshot.assessment_cycle_id=response.assessment_cycle_id
  and snapshot.company_id=response.company_id;

alter table public.assessment_responses
  enable trigger protect_assessment_response_immutability;

update public.assessment_answers answer
set assessment_execution_snapshot_id=response.assessment_execution_snapshot_id,
    assessment_execution_snapshot_question_id=snapshot_question.id
from public.assessment_responses response
join public.assessment_execution_snapshot_questions snapshot_question
  on snapshot_question.assessment_execution_snapshot_id=response.assessment_execution_snapshot_id
  and snapshot_question.company_id=response.company_id
where response.id=answer.assessment_response_id
  and answer.company_id=response.company_id
  and snapshot_question.source_assessment_question_id=answer.assessment_question_id;

do $$
begin
  if exists (select 1 from public.assessment_responses where assessment_execution_snapshot_id is null)
    or exists (
      select 1 from public.assessment_answers
      where assessment_response_id is not null
        and (assessment_execution_snapshot_id is null
          or assessment_execution_snapshot_question_id is null)
    )
  then
    raise exception using errcode='23514',message='ASSESSMENT_SNAPSHOT_LEGACY_BACKFILL_INCOMPLETE';
  end if;
end;
$$;

alter table public.assessment_responses
  alter column assessment_execution_snapshot_id set not null,
  add constraint assessment_responses_snapshot_cycle_company_fkey
    foreign key (assessment_execution_snapshot_id, assessment_cycle_id, company_id)
    references public.assessment_execution_snapshots(id, assessment_cycle_id, company_id)
    on delete restrict;

alter table public.assessment_answers
  add constraint assessment_answers_snapshot_presence_check check (
    assessment_response_id is null
    or (assessment_execution_snapshot_id is not null
      and assessment_execution_snapshot_question_id is not null)
  ),
  add constraint assessment_answers_response_snapshot_company_fkey
    foreign key (assessment_response_id, assessment_execution_snapshot_id, company_id)
    references public.assessment_responses(id, assessment_execution_snapshot_id, company_id)
    on delete cascade,
  add constraint assessment_answers_question_snapshot_company_fkey
    foreign key (
      assessment_execution_snapshot_question_id,
      assessment_execution_snapshot_id,
      company_id
    ) references public.assessment_execution_snapshot_questions(
      id, assessment_execution_snapshot_id, company_id
    ) on delete restrict;

alter table public.assessment_answers
  drop constraint if exists assessment_answers_assessment_question_id_fkey,
  add constraint assessment_answers_question_company_fkey
    foreign key (assessment_question_id, company_id)
    references public.assessment_questions(id, company_id) on delete restrict;

create unique index assessment_answers_response_snapshot_question_uidx
  on public.assessment_answers(
    assessment_response_id, assessment_execution_snapshot_question_id
  ) where assessment_response_id is not null;

create or replace function public.protect_assessment_response_immutability()
returns trigger
language plpgsql security invoker set search_path=public,pg_temp
as $$
begin
  if old.status in ('submitted','completed') then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_IMMUTABLE';
  end if;
  if new.company_id<>old.company_id
    or new.assessment_cycle_id<>old.assessment_cycle_id
    or new.assessment_template_id<>old.assessment_template_id
    or new.assessment_execution_snapshot_id<>old.assessment_execution_snapshot_id
    or new.employee_id<>old.employee_id or new.evaluator_id<>old.evaluator_id then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_ASSIGNMENT_IMMUTABLE';
  end if;
  if new.completed_at is distinct from old.completed_at
    or new.created_at is distinct from old.created_at then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_FIELDS_IMMUTABLE';
  end if;
  if new.started_at is distinct from old.started_at and not (
    old.started_at is null and new.started_at is not null
    and old.status='draft' and new.status='in_progress'
  ) then raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_START_TIME_FORBIDDEN'; end if;
  if not (new.status=old.status
    or (old.status='draft' and new.status in ('in_progress','submitted'))
    or (old.status='in_progress' and new.status='submitted'))
    or new.status not in ('draft','in_progress','submitted') then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_TRANSITION_FORBIDDEN';
  end if;
  if new.status='submitted' and old.status<>'submitted' then
    new.submitted_at:=coalesce(new.submitted_at,now());
  elsif new.submitted_at is distinct from old.submitted_at then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_SUBMISSION_TIME_FORBIDDEN';
  end if;
  new.updated_at:=now(); return new;
end;
$$;

create or replace function public.generate_tenant_assessment_cycle_responses_v1(
  p_company_id uuid, p_assessment_cycle_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_cycle public.assessment_cycles%rowtype;
  v_template public.assessment_templates%rowtype;
  v_snapshot_id uuid;
  v_candidate_count integer := 0;
  v_created_count integer := 0;
  v_executable_question_count integer := 0;
  v_perspectives text[] := array[]::text[];
begin
  perform public.require_people_organization_mutator(p_company_id);
  select * into v_cycle from public.assessment_cycles cycle
  where cycle.id=p_assessment_cycle_id and cycle.company_id=p_company_id
    and cycle.deleted_at is null for update;
  if not found then raise exception using errcode='P0002',message='ASSESSMENT_CYCLE_NOT_FOUND'; end if;
  if v_cycle.status <> 'active' then
    raise exception using errcode='55000',message='ASSESSMENT_CYCLE_NOT_ACTIVE';
  end if;
  if v_cycle.allow_peer_assessment then
    raise exception using errcode='0A000',message='ASSESSMENT_PEER_SELECTION_NOT_SUPPORTED';
  end if;

  select * into v_template from public.assessment_templates template
  where template.id=v_cycle.assessment_template_id and template.company_id=p_company_id;
  if not found then raise exception using errcode='P0002',message='ASSESSMENT_TEMPLATE_NOT_FOUND'; end if;

  with candidates as (
    select participant.employee_id,participant.employee_id evaluator_id,'self'::text perspective
    from public.assessment_cycle_participants participant
    join public.people person on person.id=participant.employee_id
      and person.company_id=participant.company_id and person.status='active'
    where participant.company_id=p_company_id and participant.assessment_cycle_id=p_assessment_cycle_id
      and v_cycle.allow_self_assessment
    union
    select participant.employee_id,manager.id,'manager'::text
    from public.assessment_cycle_participants participant
    join public.people person on person.id=participant.employee_id
      and person.company_id=participant.company_id and person.status='active'
    join public.people manager on manager.id=person.manager_id
      and manager.company_id=participant.company_id and manager.status='active'
    where participant.company_id=p_company_id and participant.assessment_cycle_id=p_assessment_cycle_id
      and v_cycle.allow_manager_assessment
    union
    select manager_participant.employee_id,report_participant.employee_id,'direct_report'::text
    from public.assessment_cycle_participants manager_participant
    join public.people manager on manager.id=manager_participant.employee_id
      and manager.company_id=manager_participant.company_id and manager.status='active'
    join public.assessment_cycle_participants report_participant
      on report_participant.company_id=manager_participant.company_id
      and report_participant.assessment_cycle_id=manager_participant.assessment_cycle_id
    join public.people report on report.id=report_participant.employee_id
      and report.company_id=report_participant.company_id and report.status='active'
      and report.manager_id=manager.id
    where manager_participant.company_id=p_company_id
      and manager_participant.assessment_cycle_id=p_assessment_cycle_id
      and v_cycle.allow_direct_report_assessment
  ), missing as (
    select candidate.* from candidates candidate where not exists (
      select 1 from public.assessment_responses response
      where response.assessment_cycle_id=p_assessment_cycle_id
        and response.assessment_template_id=v_cycle.assessment_template_id
        and response.employee_id=candidate.employee_id
        and response.evaluator_id=candidate.evaluator_id
    )
  ) select count(*)::integer into v_candidate_count from missing;

  select snapshot.id into v_snapshot_id from public.assessment_execution_snapshots snapshot
  where snapshot.assessment_cycle_id=p_assessment_cycle_id and snapshot.company_id=p_company_id;

  if v_candidate_count = 0 then
    return jsonb_build_object('status','no_change','assessmentCycleId',p_assessment_cycle_id,
      'createdResponseCount',0,'perspectives','[]'::jsonb);
  end if;

  if v_snapshot_id is null then
    if v_template.deleted_at is not null or v_template.status <> 'active' or not v_template.active then
      raise exception using errcode='55000',message='ASSESSMENT_TEMPLATE_ARCHIVED';
    end if;
    select count(*)::integer into v_executable_question_count
    from public.assessment_questions question
    join public.assessment_sections section on section.id=question.assessment_section_id
      and section.company_id=question.company_id
    where question.company_id=p_company_id
      and section.assessment_template_id=v_cycle.assessment_template_id
      and section.active and section.deleted_at is null
      and question.active and question.deleted_at is null;
    if v_executable_question_count = 0 then
      raise exception using errcode='22023',message='ASSESSMENT_EXECUTION_QUESTIONS_REQUIRED';
    end if;

    insert into public.assessment_execution_snapshots(
      company_id,assessment_cycle_id,source_assessment_template_id,template_name,
      template_description,template_instructions,template_type,capture_origin
    ) values (
      p_company_id,p_assessment_cycle_id,v_template.id,v_template.name,
      v_template.description,v_template.instructions,v_template.type,'response_generation'
    ) returning id into v_snapshot_id;

    insert into public.assessment_execution_snapshot_sections(
      company_id,assessment_execution_snapshot_id,source_assessment_section_id,
      code,name,description,weight,display_order,active_at_capture
    ) select p_company_id,v_snapshot_id,section.id,section.code,section.name,
      section.description,section.weight,section.display_order,
      section.active and section.deleted_at is null
    from public.assessment_sections section
    where section.company_id=p_company_id
      and section.assessment_template_id=v_cycle.assessment_template_id
      and section.deleted_at is null order by section.display_order,section.id;

    insert into public.assessment_execution_snapshot_questions(
      company_id,assessment_execution_snapshot_id,
      assessment_execution_snapshot_section_id,source_assessment_question_id,
      source_competency_id,competency_name,code,question,help_text,question_type,
      required,weight,display_order,scale_min,scale_max,active_at_capture
    ) select p_company_id,v_snapshot_id,snapshot_section.id,question.id,
      question.competency_id,competency.name,question.code,question.question,
      question.help_text,question.question_type,question.required,question.weight,
      question.display_order,question.scale_min,question.scale_max,
      question.active and question.deleted_at is null and snapshot_section.active_at_capture
    from public.assessment_execution_snapshot_sections snapshot_section
    join public.assessment_questions question
      on question.assessment_section_id=snapshot_section.source_assessment_section_id
      and question.company_id=snapshot_section.company_id
    left join public.competencies competency
      on competency.id=question.competency_id and competency.company_id=question.company_id
    where snapshot_section.assessment_execution_snapshot_id=v_snapshot_id
      and question.deleted_at is null
    order by snapshot_section.display_order,question.display_order,question.id;
  end if;

  with candidates as (
    select participant.employee_id,participant.employee_id evaluator_id,'self'::text perspective
    from public.assessment_cycle_participants participant
    join public.people person on person.id=participant.employee_id
      and person.company_id=participant.company_id and person.status='active'
    where participant.company_id=p_company_id and participant.assessment_cycle_id=p_assessment_cycle_id
      and v_cycle.allow_self_assessment
    union
    select participant.employee_id,manager.id,'manager'::text
    from public.assessment_cycle_participants participant
    join public.people person on person.id=participant.employee_id
      and person.company_id=participant.company_id and person.status='active'
    join public.people manager on manager.id=person.manager_id
      and manager.company_id=participant.company_id and manager.status='active'
    where participant.company_id=p_company_id and participant.assessment_cycle_id=p_assessment_cycle_id
      and v_cycle.allow_manager_assessment
    union
    select manager_participant.employee_id,report_participant.employee_id,'direct_report'::text
    from public.assessment_cycle_participants manager_participant
    join public.people manager on manager.id=manager_participant.employee_id
      and manager.company_id=manager_participant.company_id and manager.status='active'
    join public.assessment_cycle_participants report_participant
      on report_participant.company_id=manager_participant.company_id
      and report_participant.assessment_cycle_id=manager_participant.assessment_cycle_id
    join public.people report on report.id=report_participant.employee_id
      and report.company_id=report_participant.company_id and report.status='active'
      and report.manager_id=manager.id
    where manager_participant.company_id=p_company_id
      and manager_participant.assessment_cycle_id=p_assessment_cycle_id
      and v_cycle.allow_direct_report_assessment
  ), inserted as (
    insert into public.assessment_responses(
      company_id,assessment_cycle_id,assessment_template_id,
      assessment_execution_snapshot_id,employee_id,evaluator_id,status
    ) select p_company_id,p_assessment_cycle_id,v_cycle.assessment_template_id,
      v_snapshot_id,candidate.employee_id,candidate.evaluator_id,'draft'
    from candidates candidate
    on conflict (assessment_cycle_id,assessment_template_id,employee_id,evaluator_id) do nothing
    returning employee_id,evaluator_id
  ) select (select count(*)::integer from inserted),
    coalesce(array_agg(distinct candidate.perspective order by candidate.perspective)
      filter(where inserted.employee_id is not null),array[]::text[])
  into v_created_count,v_perspectives
  from candidates candidate left join inserted
    on inserted.employee_id=candidate.employee_id and inserted.evaluator_id=candidate.evaluator_id;

  if v_created_count > 0 then
    perform public.append_people_organization_activity(
      p_company_id,'assessment_cycle.responses_generated','assessments',
      'Avaliações do ciclo geradas','As avaliações do ciclo foram geradas.',
      'assessment_cycle',p_assessment_cycle_id,null,null,
      jsonb_build_object('assessmentCycleId',p_assessment_cycle_id,
        'createdResponseCount',v_created_count,'perspectives',to_jsonb(v_perspectives))
    );
  end if;
  return jsonb_build_object('status',case when v_created_count=0 then 'no_change' else 'succeeded' end,
    'assessmentCycleId',p_assessment_cycle_id,'createdResponseCount',v_created_count,
    'perspectives',to_jsonb(v_perspectives));
end;
$$;

create or replace function public.save_tenant_assessment_answer_v1(
  p_company_id uuid,p_assessment_response_id uuid,p_assessment_question_id uuid,
  p_answer_text text,p_answer_number numeric,p_answer_boolean boolean,p_score integer
)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  v_response public.assessment_responses%rowtype;
  v_question public.assessment_execution_snapshot_questions%rowtype;
  v_actor_person_id uuid; v_answer public.assessment_answers%rowtype;
  v_answer_id uuid; v_answer_text text:=nullif(btrim(p_answer_text),'');
  v_changed boolean:=false; v_started boolean:=false;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_response from public.assessment_responses response
  where response.id=p_assessment_response_id and response.company_id=p_company_id for update;
  if not found then raise exception using errcode='P0002',message='ASSESSMENT_RESPONSE_NOT_FOUND'; end if;
  v_actor_person_id:=public.current_person_id(p_company_id);
  if not public.is_company_member(p_company_id) or v_actor_person_id is null
    or v_actor_person_id<>v_response.evaluator_id then
    raise exception using errcode='42501',message='ASSESSMENT_RESPONSE_WRITE_DENIED';
  end if;
  if v_response.status not in ('draft','in_progress') then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_IMMUTABLE';
  end if;
  select question.* into v_question
  from public.assessment_execution_snapshot_questions question
  join public.assessment_execution_snapshot_sections section
    on section.id=question.assessment_execution_snapshot_section_id
    and section.assessment_execution_snapshot_id=question.assessment_execution_snapshot_id
    and section.company_id=question.company_id
  where question.assessment_execution_snapshot_id=v_response.assessment_execution_snapshot_id
    and question.company_id=p_company_id
    and question.source_assessment_question_id=p_assessment_question_id
    and question.active_at_capture and section.active_at_capture;
  if not found then raise exception using errcode='P0002',message='ASSESSMENT_QUESTION_NOT_ANSWERABLE'; end if;
  if num_nonnulls(v_answer_text,p_answer_number,p_answer_boolean,p_score)<>1
    or (p_answer_text is not null and v_answer_text is null)
    or (v_answer_text is not null and char_length(v_answer_text)>5000)
    or (v_question.question_type='scale' and (p_score is null or p_score<v_question.scale_min
      or p_score>v_question.scale_max or v_answer_text is not null
      or p_answer_number is not null or p_answer_boolean is not null))
    or (v_question.question_type='yes_no' and (p_answer_boolean is null
      or v_answer_text is not null or p_answer_number is not null or p_score is not null))
    or (v_question.question_type='text' and (v_answer_text is null
      or p_answer_number is not null or p_answer_boolean is not null or p_score is not null))
    or (v_question.question_type='number' and (p_answer_number is null
      or p_answer_number<v_question.scale_min or p_answer_number>v_question.scale_max
      or v_answer_text is not null or p_answer_boolean is not null or p_score is not null))
  then raise exception using errcode='22023',message='ASSESSMENT_ANSWER_INVALID'; end if;
  select * into v_answer from public.assessment_answers answer
  where answer.assessment_response_id=p_assessment_response_id
    and answer.assessment_execution_snapshot_question_id=v_question.id for update;
  if found then
    v_answer_id:=v_answer.id;
    v_changed:=v_answer.answer_text is distinct from v_answer_text
      or v_answer.answer_number is distinct from p_answer_number
      or v_answer.answer_boolean is distinct from p_answer_boolean
      or v_answer.score is distinct from p_score;
    if v_changed then update public.assessment_answers set answer_text=v_answer_text,
      answer_number=p_answer_number,answer_boolean=p_answer_boolean,score=p_score,updated_at=now()
      where id=v_answer.id; end if;
  else
    insert into public.assessment_answers(company_id,assessment_response_id,
      assessment_question_id,assessment_execution_snapshot_id,
      assessment_execution_snapshot_question_id,answer_text,answer_number,
      answer_boolean,score)
    values(p_company_id,p_assessment_response_id,p_assessment_question_id,
      v_response.assessment_execution_snapshot_id,v_question.id,v_answer_text,
      p_answer_number,p_answer_boolean,p_score) returning id into v_answer_id;
    v_changed:=true;
  end if;
  if v_response.status='draft' then
    update public.assessment_responses set status='in_progress',started_at=coalesce(started_at,now())
    where id=p_assessment_response_id; v_started:=true;
  end if;
  return jsonb_build_object('status',case when v_changed or v_started then 'succeeded' else 'no_change' end,
    'assessmentAnswerId',v_answer_id,'assessmentResponseId',p_assessment_response_id,
    'assessmentQuestionId',p_assessment_question_id,
    'responseStatus',case when v_started then 'in_progress' else v_response.status end);
end;
$$;

create or replace function public.submit_tenant_assessment_response_v1(
  p_company_id uuid,p_assessment_response_id uuid
)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_response public.assessment_responses%rowtype; v_actor_person_id uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_response from public.assessment_responses response
  where response.id=p_assessment_response_id and response.company_id=p_company_id for update;
  if not found then raise exception using errcode='P0002',message='ASSESSMENT_RESPONSE_NOT_FOUND'; end if;
  v_actor_person_id:=public.current_person_id(p_company_id);
  if not public.is_company_member(p_company_id) or v_actor_person_id is null
    or v_actor_person_id<>v_response.evaluator_id then
    raise exception using errcode='42501',message='ASSESSMENT_RESPONSE_WRITE_DENIED';
  end if;
  if v_response.status='submitted' then return jsonb_build_object(
    'status','already_submitted','assessmentResponseId',p_assessment_response_id); end if;
  if v_response.status not in ('draft','in_progress') then
    raise exception using errcode='55000',message='ASSESSMENT_RESPONSE_IMMUTABLE'; end if;
  if exists (
    select 1 from public.assessment_execution_snapshot_questions question
    join public.assessment_execution_snapshot_sections section
      on section.id=question.assessment_execution_snapshot_section_id
      and section.assessment_execution_snapshot_id=question.assessment_execution_snapshot_id
      and section.company_id=question.company_id
    where question.assessment_execution_snapshot_id=v_response.assessment_execution_snapshot_id
      and question.company_id=p_company_id and section.active_at_capture
      and question.active_at_capture and question.required and not exists (
        select 1 from public.assessment_answers answer
        where answer.company_id=p_company_id
          and answer.assessment_response_id=p_assessment_response_id
          and answer.assessment_execution_snapshot_question_id=question.id
          and ((question.question_type='scale' and answer.score between question.scale_min and question.scale_max
              and num_nonnulls(answer.answer_text,answer.answer_number,answer.answer_boolean,answer.score)=1)
            or (question.question_type='yes_no' and answer.answer_boolean is not null
              and num_nonnulls(answer.answer_text,answer.answer_number,answer.answer_boolean,answer.score)=1)
            or (question.question_type='text' and nullif(btrim(answer.answer_text),'') is not null
              and char_length(btrim(answer.answer_text))<=5000
              and num_nonnulls(answer.answer_text,answer.answer_number,answer.answer_boolean,answer.score)=1)
            or (question.question_type='number' and answer.answer_number between question.scale_min and question.scale_max
              and num_nonnulls(answer.answer_text,answer.answer_number,answer.answer_boolean,answer.score)=1))
      )
  ) then raise exception using errcode='22023',message='ASSESSMENT_REQUIRED_ANSWERS_MISSING'; end if;
  update public.assessment_responses set status='submitted',submitted_at=coalesce(submitted_at,now())
  where id=p_assessment_response_id;
  perform public.append_people_organization_activity(p_company_id,
    'assessment_response.submitted','assessments','Avaliação enviada',
    'As respostas da avaliação foram enviadas pelo avaliador designado.',
    'assessment_response',p_assessment_response_id,'employee',v_response.employee_id,
    jsonb_build_object('assessmentResponseId',p_assessment_response_id,
      'assessmentCycleId',v_response.assessment_cycle_id,
      'assessmentTemplateId',v_response.assessment_template_id,
      'employeeId',v_response.employee_id,'evaluatorId',v_response.evaluator_id));
  return jsonb_build_object('status','succeeded','assessmentResponseId',p_assessment_response_id);
end;
$$;

-- Execution read keeps its public row shape while sourcing immutable snapshot rows.
create or replace function public.get_assessment_evaluator_workspace_v1(
  p_company_id uuid,p_response_id uuid
)
returns table(
  record_type text,record_id uuid,parent_id uuid,template_id uuid,cycle_id uuid,
  employee_id uuid,evaluator_id uuid,status text,name text,description text,
  instructions text,assessment_type text,icon text,color text,weight numeric,
  display_order integer,question text,help_text text,question_type text,
  scale_min integer,scale_max integer,required boolean,active boolean,
  started_at timestamptz,completed_at timestamptz,submitted_at timestamptz,
  competency_id uuid,competency_name text
)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_snapshot_id uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select response.assessment_execution_snapshot_id into v_snapshot_id
  from public.assessment_responses response where response.company_id=p_company_id
    and response.id=p_response_id
    and response.evaluator_id=public.current_person_id(p_company_id)
    and public.is_company_member(p_company_id);
  if v_snapshot_id is null then return; end if;
  return query select rows.* from (
    select 'response'::text,response.id,null::uuid,response.assessment_template_id,
      response.assessment_cycle_id,response.employee_id,response.evaluator_id,response.status,
      null::text,null::text,null::text,null::text,null::text,null::text,null::numeric,
      null::integer,null::text,null::text,null::text,null::integer,null::integer,
      null::boolean,null::boolean,response.started_at,response.completed_at,response.submitted_at,
      null::uuid,null::text
    from public.assessment_responses response
    where response.company_id=p_company_id and response.id=p_response_id
    union all
    select 'template',snapshot.source_assessment_template_id,null,snapshot.source_assessment_template_id,
      null,null,null,'active',snapshot.template_name,snapshot.template_description,
      snapshot.template_instructions,snapshot.template_type,null,null,null,null,null,null,null,
      null,null,null,true,null,null,null,null::uuid,null::text
    from public.assessment_execution_snapshots snapshot where snapshot.id=v_snapshot_id
    union all
    select 'section',section.source_assessment_section_id,snapshot.source_assessment_template_id,
      snapshot.source_assessment_template_id,null,null,null,null,section.name,section.description,
      null,null,null,null,section.weight,section.display_order,null,null,null,null,null,null,
      section.active_at_capture,null,null,null,null::uuid,null::text
    from public.assessment_execution_snapshot_sections section
    join public.assessment_execution_snapshots snapshot on snapshot.id=section.assessment_execution_snapshot_id
    where section.assessment_execution_snapshot_id=v_snapshot_id
    union all
    select 'question',question.source_assessment_question_id,section.source_assessment_section_id,
      snapshot.source_assessment_template_id,null,null,null,null,null,null,null,null,null,null,
      question.weight,question.display_order,question.question,question.help_text,
      question.question_type,question.scale_min,question.scale_max,question.required,
      question.active_at_capture,null,null,null,question.source_competency_id,question.competency_name
    from public.assessment_execution_snapshot_questions question
    join public.assessment_execution_snapshot_sections section
      on section.id=question.assessment_execution_snapshot_section_id
    join public.assessment_execution_snapshots snapshot
      on snapshot.id=question.assessment_execution_snapshot_id
    where question.assessment_execution_snapshot_id=v_snapshot_id
  ) rows order by 1,16,2;
end; $$;

create function public.get_tenant_assessment_response_structure_v1(
  p_company_id uuid,p_response_id uuid
)
returns table(
  record_type text,record_id uuid,parent_id uuid,name text,description text,
  instructions text,assessment_type text,status text,icon text,color text,
  weight numeric,display_order integer,question text,help_text text,
  question_type text,scale_min integer,scale_max integer,required boolean,
  active boolean,competency_id uuid,competency_name text
)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_snapshot_id uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.has_company_role(p_company_id,array['owner','admin','hr']) then
    raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  select response.assessment_execution_snapshot_id into v_snapshot_id
  from public.assessment_responses response
  where response.company_id=p_company_id and response.id=p_response_id;
  if v_snapshot_id is null then return; end if;
  return query select rows.* from (
    select 'template'::text,snapshot.source_assessment_template_id,null::uuid,
      snapshot.template_name,snapshot.template_description,snapshot.template_instructions,
      snapshot.template_type,'active'::text,null::text,null::text,null::numeric,null::integer,
      null::text,null::text,null::text,null::integer,null::integer,null::boolean,true,
      null::uuid,null::text
    from public.assessment_execution_snapshots snapshot where snapshot.id=v_snapshot_id
    union all
    select 'section',section.source_assessment_section_id,snapshot.source_assessment_template_id,
      section.name,section.description,null,null,null,null,null,section.weight,
      section.display_order,null,null,null,null,null,null,section.active_at_capture,null::uuid,null::text
    from public.assessment_execution_snapshot_sections section
    join public.assessment_execution_snapshots snapshot on snapshot.id=section.assessment_execution_snapshot_id
    where section.assessment_execution_snapshot_id=v_snapshot_id
    union all
    select 'question',question.source_assessment_question_id,section.source_assessment_section_id,
      null,null,null,null,null,null,null,question.weight,question.display_order,question.question,
      question.help_text,question.question_type,question.scale_min,question.scale_max,
      question.required,question.active_at_capture,question.source_competency_id,question.competency_name
    from public.assessment_execution_snapshot_questions question
    join public.assessment_execution_snapshot_sections section
      on section.id=question.assessment_execution_snapshot_section_id
    where question.assessment_execution_snapshot_id=v_snapshot_id
  ) rows order by 1,12,2;
end; $$;

create or replace function public.read_assessment_result_for_evaluatee(
  p_company_id uuid,p_assessment_response_id uuid
)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_response_id uuid; v_response_status text; v_visibility text;
  v_answers jsonb; v_competencies jsonb; v_overall_score numeric;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select response.id,response.status,cycle.assessment_visibility
  into v_response_id,v_response_status,v_visibility
  from public.assessment_responses response
  join public.assessment_cycles cycle on cycle.id=response.assessment_cycle_id
    and cycle.company_id=response.company_id
  where response.company_id=p_company_id and response.id=p_assessment_response_id
    and response.employee_id=public.current_person_id(p_company_id)
    and public.is_company_member(p_company_id)
    and response.status in ('submitted','completed');
  if not found or v_visibility='none' then raise exception 'ASSESSMENT_RESULT_NOT_VISIBLE'; end if;
  select avg(answer.score) into v_overall_score from public.assessment_answers answer
  where answer.company_id=p_company_id and answer.assessment_response_id=p_assessment_response_id
    and answer.score is not null;
  if v_visibility in ('score_and_competencies','full') then
    select coalesce(jsonb_agg(row_data order by section_name),'[]'::jsonb) into v_competencies
    from (
      select jsonb_build_object('sectionId',scores.section_id,'sectionName',scores.section_name,
        'averageScore',avg(scores.score)) row_data,scores.section_name
      from (
        select section.source_assessment_section_id section_id,section.name section_name,answer.score
        from public.assessment_answers answer
        join public.assessment_execution_snapshot_questions question
          on question.id=answer.assessment_execution_snapshot_question_id
          and question.company_id=answer.company_id
        join public.assessment_execution_snapshot_sections section
          on section.id=question.assessment_execution_snapshot_section_id
          and section.company_id=question.company_id
        where answer.company_id=p_company_id
          and answer.assessment_response_id=p_assessment_response_id and answer.score is not null
      ) scores group by scores.section_id,scores.section_name
    ) competency_rows;
  else v_competencies:='[]'::jsonb; end if;
  if v_visibility='full' then
    select coalesce(jsonb_agg(to_jsonb(answer) order by answer.created_at),'[]'::jsonb)
    into v_answers from public.assessment_answers answer
    where answer.company_id=p_company_id and answer.assessment_response_id=p_assessment_response_id;
  elsif v_visibility='score_and_comments' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'assessmentQuestionId',answer.assessment_question_id,'score',answer.score,
      'comment',answer.answer_text) order by answer.created_at),'[]'::jsonb)
    into v_answers from public.assessment_answers answer
    where answer.company_id=p_company_id and answer.assessment_response_id=p_assessment_response_id;
  else v_answers:='[]'::jsonb; end if;
  return jsonb_build_object('assessmentResponseId',v_response_id,'status',v_response_status,
    'visibility',v_visibility,'overallScore',v_overall_score,
    'competencies',v_competencies,'answers',v_answers);
end;
$$;

alter table public.assessment_execution_snapshots enable row level security;
alter table public.assessment_execution_snapshot_sections enable row level security;
alter table public.assessment_execution_snapshot_questions enable row level security;

revoke all on table public.assessment_execution_snapshots,
  public.assessment_execution_snapshot_sections,
  public.assessment_execution_snapshot_questions
from public,anon,authenticated,service_role;

revoke all on function public.get_tenant_assessment_response_structure_v1(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.get_tenant_assessment_response_structure_v1(uuid,uuid)
  to authenticated;

-- Existing v1 mutation/read grants remain signature-compatible; close any inherited defaults.
revoke all on function public.generate_tenant_assessment_cycle_responses_v1(uuid,uuid),
  public.save_tenant_assessment_answer_v1(uuid,uuid,uuid,text,numeric,boolean,integer),
  public.submit_tenant_assessment_response_v1(uuid,uuid),
  public.get_assessment_evaluator_workspace_v1(uuid,uuid),
  public.read_assessment_result_for_evaluatee(uuid,uuid)
from public,anon,authenticated,service_role;
grant execute on function public.generate_tenant_assessment_cycle_responses_v1(uuid,uuid),
  public.save_tenant_assessment_answer_v1(uuid,uuid,uuid,text,numeric,boolean,integer),
  public.submit_tenant_assessment_response_v1(uuid,uuid),
  public.get_assessment_evaluator_workspace_v1(uuid,uuid),
  public.read_assessment_result_for_evaluatee(uuid,uuid)
to authenticated;

notify pgrst,'reload schema';
