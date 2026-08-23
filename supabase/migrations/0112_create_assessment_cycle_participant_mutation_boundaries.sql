-- Trusted Assessment Cycle, Participant and response-generation mutations.
--
-- ASSESSMENT TEMPLATE EXECUTION SNAPSHOT remains explicit product debt: generated
-- responses still read the live Model/Section/Question structure.
-- ASSESSMENT PEER SELECTION STRATEGY remains explicit product debt: generation
-- fails closed while peer assessment is enabled.

revoke insert, update, delete, truncate, trigger, maintain
  on table public.assessment_cycles, public.assessment_cycle_participants
  from public, anon, authenticated;

revoke insert on table public.assessment_responses
  from public, anon, authenticated;

create or replace function public.create_tenant_assessment_cycle_v1(
  p_company_id uuid,
  p_name text,
  p_description text,
  p_assessment_type text,
  p_assessment_template_id uuid,
  p_status text,
  p_start_date date,
  p_end_date date,
  p_close_date date,
  p_allow_self_assessment boolean,
  p_allow_manager_assessment boolean,
  p_allow_peer_assessment boolean,
  p_allow_direct_report_assessment boolean,
  p_anonymous boolean,
  p_assessment_visibility text,
  p_idempotency_key text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_id uuid;
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
  v_key text := 'assessments:cycle:create:' || btrim(coalesce(p_idempotency_key, ''));
  v_fingerprint text;
  v_existing public.activity_events%rowtype;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);

  if v_name is null or char_length(v_name) not between 2 and 120
    or (v_description is not null and char_length(v_description) > 500)
    or p_assessment_type not in ('performance','competency','experience','probation','360','custom')
    or p_status <> 'draft'
    or p_start_date is null or p_end_date is null or p_end_date < p_start_date
    or (p_close_date is not null and p_close_date < p_end_date)
    or p_allow_self_assessment is null or p_allow_manager_assessment is null
    or p_allow_peer_assessment is null or p_allow_direct_report_assessment is null
    or not (p_allow_self_assessment or p_allow_manager_assessment
      or p_allow_peer_assessment or p_allow_direct_report_assessment)
    or p_anonymous is null
    or p_assessment_visibility not in ('none','score','score_and_competencies','score_and_comments','full')
    or nullif(btrim(coalesce(p_idempotency_key, '')), '') is null
    or char_length(btrim(p_idempotency_key)) > 200
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  if not exists (
    select 1 from public.assessment_templates template
    where template.id = p_assessment_template_id
      and template.company_id = p_company_id
      and template.status = 'active'
      and template.active = true
      and template.deleted_at is null
  ) then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_TEMPLATE_NOT_FOUND';
  end if;

  v_fingerprint := encode(extensions.digest(jsonb_build_object(
    'name', v_name, 'description', v_description,
    'assessmentType', p_assessment_type,
    'assessmentTemplateId', p_assessment_template_id,
    'status', p_status, 'startDate', p_start_date, 'endDate', p_end_date,
    'closeDate', p_close_date, 'allowSelfAssessment', p_allow_self_assessment,
    'allowManagerAssessment', p_allow_manager_assessment,
    'allowPeerAssessment', p_allow_peer_assessment,
    'allowDirectReportAssessment', p_allow_direct_report_assessment,
    'anonymous', p_anonymous, 'assessmentVisibility', p_assessment_visibility
  )::text, 'sha256'), 'hex');

  perform pg_advisory_xact_lock(hashtextextended(
    p_company_id::text || ':' || v_actor::text || ':' || v_key, 0
  ));

  select * into v_existing from public.activity_events event
  where event.company_id = p_company_id and event.idempotency_key = v_key;

  if found then
    if v_existing.activity_type <> 'assessment_cycle.created'
      or v_existing.metadata ->> 'intentFingerprint' <> v_fingerprint
    then
      raise exception using errcode = '23505', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'status', 'idempotent_retry', 'assessmentCycleId', v_existing.entity_id
    );
  end if;

  insert into public.assessment_cycles (
    company_id, name, description, assessment_type, assessment_template_id,
    status, start_date, end_date, close_date, allow_self_assessment,
    allow_manager_assessment, allow_peer_assessment,
    allow_direct_report_assessment, anonymous, assessment_visibility
  ) values (
    p_company_id, v_name, v_description, p_assessment_type,
    p_assessment_template_id, 'draft', p_start_date, p_end_date, p_close_date,
    p_allow_self_assessment, p_allow_manager_assessment,
    p_allow_peer_assessment, p_allow_direct_report_assessment,
    p_anonymous, p_assessment_visibility
  ) returning id into v_id;

  perform public.append_people_organization_activity(
    p_company_id, 'assessment_cycle.created', 'assessments',
    'Ciclo de avaliação criado', 'Um ciclo de avaliação foi criado.',
    'assessment_cycle', v_id, null, null,
    jsonb_build_object(
      'assessmentCycleId', v_id,
      'assessmentTemplateId', p_assessment_template_id,
      'intentFingerprint', v_fingerprint
    ), v_key
  );

  return jsonb_build_object('status', 'succeeded', 'assessmentCycleId', v_id);
end;
$$;

create or replace function public.update_tenant_assessment_cycle_v1(
  p_company_id uuid,
  p_assessment_cycle_id uuid,
  p_name text,
  p_description text,
  p_assessment_type text,
  p_assessment_template_id uuid,
  p_status text,
  p_start_date date,
  p_end_date date,
  p_close_date date,
  p_allow_self_assessment boolean,
  p_allow_manager_assessment boolean,
  p_allow_peer_assessment boolean,
  p_allow_direct_report_assessment boolean,
  p_anonymous boolean,
  p_assessment_visibility text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.assessment_cycles%rowtype;
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
  v_structural_change boolean;
  v_activity_type text;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current from public.assessment_cycles cycle
  where cycle.id = p_assessment_cycle_id
    and cycle.company_id = p_company_id
    and cycle.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_CYCLE_NOT_FOUND';
  end if;

  if v_name is null or char_length(v_name) not between 2 and 120
    or (v_description is not null and char_length(v_description) > 500)
    or p_assessment_type not in ('performance','competency','experience','probation','360','custom')
    or p_status not in ('draft','scheduled','active','completed','cancelled')
    or p_start_date is null or p_end_date is null or p_end_date < p_start_date
    or (p_close_date is not null and p_close_date < p_end_date)
    or p_allow_self_assessment is null or p_allow_manager_assessment is null
    or p_allow_peer_assessment is null or p_allow_direct_report_assessment is null
    or not (p_allow_self_assessment or p_allow_manager_assessment
      or p_allow_peer_assessment or p_allow_direct_report_assessment)
    or p_anonymous is null
    or p_assessment_visibility not in ('none','score','score_and_competencies','score_and_comments','full')
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  v_structural_change :=
    v_name is distinct from v_current.name
    or v_description is distinct from v_current.description
    or p_assessment_type is distinct from v_current.assessment_type
    or p_assessment_template_id is distinct from v_current.assessment_template_id
    or p_start_date is distinct from v_current.start_date
    or p_end_date is distinct from v_current.end_date
    or p_close_date is distinct from v_current.close_date
    or p_allow_self_assessment is distinct from v_current.allow_self_assessment
    or p_allow_manager_assessment is distinct from v_current.allow_manager_assessment
    or p_allow_peer_assessment is distinct from v_current.allow_peer_assessment
    or p_allow_direct_report_assessment is distinct from v_current.allow_direct_report_assessment
    or p_anonymous is distinct from v_current.anonymous
    or p_assessment_visibility is distinct from v_current.assessment_visibility;

  if v_current.status <> 'draft' and v_structural_change then
    raise exception using errcode = '55000', message = 'ASSESSMENT_CYCLE_CONFIGURATION_FROZEN';
  end if;

  if p_assessment_template_id is distinct from v_current.assessment_template_id
    and not exists (
      select 1 from public.assessment_templates template
      where template.id = p_assessment_template_id
        and template.company_id = p_company_id
        and template.status = 'active' and template.active = true
        and template.deleted_at is null
    )
  then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_TEMPLATE_NOT_FOUND';
  end if;

  if not (
    p_status = v_current.status
    or (v_current.status = 'draft' and p_status in ('scheduled','active','cancelled'))
    or (v_current.status = 'scheduled' and p_status in ('draft','active','cancelled'))
    or (v_current.status = 'active' and p_status in ('completed','cancelled'))
  ) then
    raise exception using errcode = '55000', message = 'ASSESSMENT_CYCLE_TRANSITION_FORBIDDEN';
  end if;

  if not v_structural_change and p_status = v_current.status then
    return jsonb_build_object(
      'status', 'no_change', 'assessmentCycleId', p_assessment_cycle_id
    );
  end if;

  update public.assessment_cycles set
    name = v_name, description = v_description,
    assessment_type = p_assessment_type,
    assessment_template_id = p_assessment_template_id,
    status = p_status, start_date = p_start_date, end_date = p_end_date,
    close_date = p_close_date, allow_self_assessment = p_allow_self_assessment,
    allow_manager_assessment = p_allow_manager_assessment,
    allow_peer_assessment = p_allow_peer_assessment,
    allow_direct_report_assessment = p_allow_direct_report_assessment,
    anonymous = p_anonymous, assessment_visibility = p_assessment_visibility,
    updated_at = now()
  where id = p_assessment_cycle_id and company_id = p_company_id;

  v_activity_type := case
    when p_status = 'active' and v_current.status <> 'active'
      then 'assessment_cycle.activated'
    when p_status = 'completed' then 'assessment_cycle.completed'
    when p_status = 'cancelled' then 'assessment_cycle.cancelled'
    else 'assessment_cycle.updated'
  end;

  perform public.append_people_organization_activity(
    p_company_id, v_activity_type, 'assessments',
    case v_activity_type
      when 'assessment_cycle.activated' then 'Ciclo de avaliação ativado'
      when 'assessment_cycle.completed' then 'Ciclo de avaliação concluído'
      when 'assessment_cycle.cancelled' then 'Ciclo de avaliação cancelado'
      else 'Ciclo de avaliação atualizado'
    end,
    'O ciclo de avaliação foi atualizado.',
    'assessment_cycle', p_assessment_cycle_id,
    null, null,
    jsonb_build_object(
      'assessmentCycleId', p_assessment_cycle_id,
      'previousStatus', v_current.status,
      'status', p_status
    )
  );

  return jsonb_build_object('status', 'succeeded', 'assessmentCycleId', p_assessment_cycle_id);
end;
$$;

create or replace function public.archive_tenant_assessment_cycle_v1(
  p_company_id uuid,
  p_assessment_cycle_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.assessment_cycles%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current from public.assessment_cycles cycle
  where cycle.id = p_assessment_cycle_id and cycle.company_id = p_company_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_CYCLE_NOT_FOUND';
  end if;

  if v_current.deleted_at is not null then
    return jsonb_build_object(
      'status', 'already_archived', 'assessmentCycleId', p_assessment_cycle_id
    );
  end if;

  update public.assessment_cycles set deleted_at = now(), updated_at = now()
  where id = p_assessment_cycle_id and company_id = p_company_id;

  perform public.append_people_organization_activity(
    p_company_id, 'assessment_cycle.archived', 'assessments',
    'Ciclo de avaliação arquivado', 'O ciclo de avaliação foi arquivado.',
    'assessment_cycle', p_assessment_cycle_id
  );

  return jsonb_build_object('status', 'succeeded', 'assessmentCycleId', p_assessment_cycle_id);
end;
$$;

create or replace function public.add_tenant_assessment_cycle_participants_v1(
  p_company_id uuid,
  p_assessment_cycle_id uuid,
  p_employee_ids uuid[]
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_cycle public.assessment_cycles%rowtype;
  v_employee_ids uuid[];
  v_added_ids uuid[];
  v_added_count integer := 0;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_cycle from public.assessment_cycles cycle
  where cycle.id = p_assessment_cycle_id
    and cycle.company_id = p_company_id and cycle.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_CYCLE_NOT_FOUND';
  end if;

  if v_cycle.status not in ('draft','scheduled','active') then
    raise exception using errcode = '55000', message = 'ASSESSMENT_CYCLE_PARTICIPANTS_FROZEN';
  end if;

  if v_cycle.status = 'active' and exists (
    select 1 from public.assessment_responses response
    where response.company_id = p_company_id
      and response.assessment_cycle_id = p_assessment_cycle_id
  ) then
    raise exception using errcode = '55000', message = 'ASSESSMENT_CYCLE_PARTICIPANTS_FROZEN';
  end if;

  select coalesce(array_agg(distinct employee_id order by employee_id), array[]::uuid[])
  into v_employee_ids
  from unnest(coalesce(p_employee_ids, array[]::uuid[])) as requested(employee_id)
  where requested.employee_id is not null;

  if cardinality(v_employee_ids) = 0 then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  if exists (
    select 1 from unnest(v_employee_ids) requested(employee_id)
    left join public.people person
      on person.id = requested.employee_id
      and person.company_id = p_company_id
      and person.status = 'active'
    where person.id is null
  ) then
    raise exception using errcode = 'P0002', message = 'ACTIVE_PARTICIPANT_NOT_FOUND';
  end if;

  with inserted as (
    insert into public.assessment_cycle_participants (
      company_id, assessment_cycle_id, employee_id
    )
    select p_company_id, p_assessment_cycle_id, requested.employee_id
    from unnest(v_employee_ids) as requested(employee_id)
    on conflict (assessment_cycle_id, employee_id) do nothing
    returning employee_id
  )
  select coalesce(array_agg(employee_id order by employee_id), array[]::uuid[]), count(*)::integer
  into v_added_ids, v_added_count
  from inserted;

  if v_added_count > 0 then
    perform public.append_people_organization_activity(
      p_company_id, 'assessment_cycle.participants_added', 'assessments',
      'Participantes adicionados ao ciclo',
      'Participantes foram adicionados ao ciclo de avaliação.',
      'assessment_cycle', p_assessment_cycle_id,
      null, null,
      jsonb_build_object(
        'assessmentCycleId', p_assessment_cycle_id,
        'participantCount', v_added_count,
        'participantIds', to_jsonb(v_added_ids)
      )
    );
  end if;

  return jsonb_build_object(
    'status', case when v_added_count = 0 then 'no_change' else 'succeeded' end,
    'assessmentCycleId', p_assessment_cycle_id,
    'addedParticipantCount', v_added_count
  );
end;
$$;

create or replace function public.remove_tenant_assessment_cycle_participant_v1(
  p_company_id uuid,
  p_assessment_cycle_id uuid,
  p_employee_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_cycle public.assessment_cycles%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_cycle from public.assessment_cycles cycle
  where cycle.id = p_assessment_cycle_id
    and cycle.company_id = p_company_id and cycle.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_CYCLE_NOT_FOUND';
  end if;

  if v_cycle.status not in ('draft','scheduled','active') then
    raise exception using errcode = '55000', message = 'ASSESSMENT_CYCLE_PARTICIPANTS_FROZEN';
  end if;

  if not exists (
    select 1 from public.assessment_cycle_participants participant
    where participant.company_id = p_company_id
      and participant.assessment_cycle_id = p_assessment_cycle_id
      and participant.employee_id = p_employee_id
  ) then
    return jsonb_build_object(
      'status', 'already_removed', 'assessmentCycleId', p_assessment_cycle_id
    );
  end if;

  if exists (
    select 1 from public.assessment_responses response
    where response.company_id = p_company_id
      and response.assessment_cycle_id = p_assessment_cycle_id
      and p_employee_id in (response.employee_id, response.evaluator_id)
  ) then
    raise exception using errcode = '55000', message = 'ASSESSMENT_PARTICIPANT_HAS_RESPONSES';
  end if;

  delete from public.assessment_cycle_participants participant
  where participant.company_id = p_company_id
    and participant.assessment_cycle_id = p_assessment_cycle_id
    and participant.employee_id = p_employee_id;

  perform public.append_people_organization_activity(
    p_company_id, 'assessment_cycle.participant_removed', 'assessments',
    'Participante removido do ciclo',
    'Um participante foi removido do ciclo de avaliação.',
    'assessment_cycle', p_assessment_cycle_id,
    'person', p_employee_id,
    jsonb_build_object(
      'assessmentCycleId', p_assessment_cycle_id,
      'participantId', p_employee_id
    )
  );

  return jsonb_build_object(
    'status', 'succeeded', 'assessmentCycleId', p_assessment_cycle_id
  );
end;
$$;

create or replace function public.generate_tenant_assessment_cycle_responses_v1(
  p_company_id uuid,
  p_assessment_cycle_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_cycle public.assessment_cycles%rowtype;
  v_template public.assessment_templates%rowtype;
  v_candidate_count integer := 0;
  v_created_count integer := 0;
  v_perspectives text[] := array[]::text[];
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_cycle from public.assessment_cycles cycle
  where cycle.id = p_assessment_cycle_id
    and cycle.company_id = p_company_id and cycle.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_CYCLE_NOT_FOUND';
  end if;

  if v_cycle.status <> 'active' then
    raise exception using errcode = '55000', message = 'ASSESSMENT_CYCLE_NOT_ACTIVE';
  end if;

  if v_cycle.allow_peer_assessment then
    raise exception using errcode = '0A000', message = 'ASSESSMENT_PEER_SELECTION_NOT_SUPPORTED';
  end if;

  select * into v_template from public.assessment_templates template
  where template.id = v_cycle.assessment_template_id
    and template.company_id = p_company_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_TEMPLATE_NOT_FOUND';
  end if;

  with candidates as (
    select participant.employee_id, participant.employee_id as evaluator_id, 'self'::text perspective
    from public.assessment_cycle_participants participant
    join public.people person on person.id = participant.employee_id
      and person.company_id = participant.company_id and person.status = 'active'
    where participant.company_id = p_company_id
      and participant.assessment_cycle_id = p_assessment_cycle_id
      and v_cycle.allow_self_assessment
    union
    select participant.employee_id, manager.id, 'manager'::text
    from public.assessment_cycle_participants participant
    join public.people person on person.id = participant.employee_id
      and person.company_id = participant.company_id and person.status = 'active'
    join public.people manager on manager.id = person.manager_id
      and manager.company_id = participant.company_id and manager.status = 'active'
    where participant.company_id = p_company_id
      and participant.assessment_cycle_id = p_assessment_cycle_id
      and v_cycle.allow_manager_assessment
    union
    select manager_participant.employee_id, report_participant.employee_id, 'direct_report'::text
    from public.assessment_cycle_participants manager_participant
    join public.people manager on manager.id = manager_participant.employee_id
      and manager.company_id = manager_participant.company_id and manager.status = 'active'
    join public.assessment_cycle_participants report_participant
      on report_participant.company_id = manager_participant.company_id
      and report_participant.assessment_cycle_id = manager_participant.assessment_cycle_id
    join public.people report on report.id = report_participant.employee_id
      and report.company_id = report_participant.company_id
      and report.status = 'active' and report.manager_id = manager.id
    where manager_participant.company_id = p_company_id
      and manager_participant.assessment_cycle_id = p_assessment_cycle_id
      and v_cycle.allow_direct_report_assessment
  ), missing as (
    select candidate.* from candidates candidate
    where not exists (
      select 1 from public.assessment_responses response
      where response.assessment_cycle_id = p_assessment_cycle_id
        and response.assessment_template_id = v_cycle.assessment_template_id
        and response.employee_id = candidate.employee_id
        and response.evaluator_id = candidate.evaluator_id
    )
  )
  select count(*)::integer into v_candidate_count from missing;

  if v_candidate_count > 0 and (
    v_template.deleted_at is not null
    or v_template.status <> 'active'
    or not v_template.active
  ) then
    raise exception using errcode = '55000', message = 'ASSESSMENT_TEMPLATE_ARCHIVED';
  end if;

  with candidates as (
    select participant.employee_id, participant.employee_id as evaluator_id, 'self'::text perspective
    from public.assessment_cycle_participants participant
    join public.people person on person.id = participant.employee_id
      and person.company_id = participant.company_id and person.status = 'active'
    where participant.company_id = p_company_id
      and participant.assessment_cycle_id = p_assessment_cycle_id
      and v_cycle.allow_self_assessment
    union
    select participant.employee_id, manager.id, 'manager'::text
    from public.assessment_cycle_participants participant
    join public.people person on person.id = participant.employee_id
      and person.company_id = participant.company_id and person.status = 'active'
    join public.people manager on manager.id = person.manager_id
      and manager.company_id = participant.company_id and manager.status = 'active'
    where participant.company_id = p_company_id
      and participant.assessment_cycle_id = p_assessment_cycle_id
      and v_cycle.allow_manager_assessment
    union
    select manager_participant.employee_id, report_participant.employee_id, 'direct_report'::text
    from public.assessment_cycle_participants manager_participant
    join public.people manager on manager.id = manager_participant.employee_id
      and manager.company_id = manager_participant.company_id and manager.status = 'active'
    join public.assessment_cycle_participants report_participant
      on report_participant.company_id = manager_participant.company_id
      and report_participant.assessment_cycle_id = manager_participant.assessment_cycle_id
    join public.people report on report.id = report_participant.employee_id
      and report.company_id = report_participant.company_id
      and report.status = 'active' and report.manager_id = manager.id
    where manager_participant.company_id = p_company_id
      and manager_participant.assessment_cycle_id = p_assessment_cycle_id
      and v_cycle.allow_direct_report_assessment
  ), inserted as (
    insert into public.assessment_responses (
      company_id, assessment_cycle_id, assessment_template_id,
      employee_id, evaluator_id, status
    )
    select p_company_id, p_assessment_cycle_id, v_cycle.assessment_template_id,
      candidate.employee_id, candidate.evaluator_id, 'draft'
    from candidates candidate
    on conflict (assessment_cycle_id, assessment_template_id, employee_id, evaluator_id)
      do nothing
    returning employee_id, evaluator_id
  )
  select
    (select count(*)::integer from inserted),
    coalesce(array_agg(distinct candidate.perspective order by candidate.perspective)
      filter (where inserted.employee_id is not null), array[]::text[])
  into v_created_count, v_perspectives
  from candidates candidate
  left join inserted on inserted.employee_id = candidate.employee_id
    and inserted.evaluator_id = candidate.evaluator_id;

  if v_created_count > 0 then
    perform public.append_people_organization_activity(
      p_company_id, 'assessment_cycle.responses_generated', 'assessments',
      'Avaliações do ciclo geradas',
      'As avaliações do ciclo foram geradas.',
      'assessment_cycle', p_assessment_cycle_id,
      null, null,
      jsonb_build_object(
        'assessmentCycleId', p_assessment_cycle_id,
        'createdResponseCount', v_created_count,
        'perspectives', to_jsonb(v_perspectives)
      )
    );
  end if;

  return jsonb_build_object(
    'status', case when v_created_count = 0 then 'no_change' else 'succeeded' end,
    'assessmentCycleId', p_assessment_cycle_id,
    'createdResponseCount', v_created_count,
    'perspectives', to_jsonb(v_perspectives)
  );
end;
$$;

revoke all on function public.create_tenant_assessment_cycle_v1(
  uuid,text,text,text,uuid,text,date,date,date,boolean,boolean,boolean,boolean,boolean,text,text
) from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_assessment_cycle_v1(
  uuid,uuid,text,text,text,uuid,text,date,date,date,boolean,boolean,boolean,boolean,boolean,text
) from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_assessment_cycle_v1(uuid,uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.add_tenant_assessment_cycle_participants_v1(uuid,uuid,uuid[])
  from public, anon, authenticated, service_role;
revoke all on function public.remove_tenant_assessment_cycle_participant_v1(uuid,uuid,uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.generate_tenant_assessment_cycle_responses_v1(uuid,uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.create_tenant_assessment_cycle_v1(
  uuid,text,text,text,uuid,text,date,date,date,boolean,boolean,boolean,boolean,boolean,text,text
) to authenticated;
grant execute on function public.update_tenant_assessment_cycle_v1(
  uuid,uuid,text,text,text,uuid,text,date,date,date,boolean,boolean,boolean,boolean,boolean,text
) to authenticated;
grant execute on function public.archive_tenant_assessment_cycle_v1(uuid,uuid),
  public.add_tenant_assessment_cycle_participants_v1(uuid,uuid,uuid[]),
  public.remove_tenant_assessment_cycle_participant_v1(uuid,uuid,uuid),
  public.generate_tenant_assessment_cycle_responses_v1(uuid,uuid)
to authenticated;

notify pgrst, 'reload schema';
