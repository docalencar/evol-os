-- D-DB1: extend the mature deterministic application engine only at its
-- authorization seam. Resolution, snapshot, lineage and idempotency stay intact.
create function public.can_apply_development_template_v1(
  p_company_id uuid, p_actor_user_id uuid, p_employee_id uuid, p_owner_id uuid
) returns boolean language sql security definer set search_path = public, pg_temp stable as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id=p_company_id and m.user_id=p_actor_user_id and m.status='active'
      and (
        m.role in ('owner','admin','hr')
        or (m.role='manager' and exists (
          select 1 from public.people actor join public.people employee on employee.company_id=actor.company_id
          where actor.company_id=p_company_id and actor.user_id=p_actor_user_id and actor.status<>'terminated'
            and employee.id=p_employee_id and employee.status<>'terminated' and employee.manager_id=actor.id
            and p_owner_id=actor.id
        ))
      )
  )
$$;

create or replace function public.reserve_development_template_application_v1(
  p_resolution jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot jsonb := p_resolution -> 'snapshot';
  v_metadata jsonb := p_resolution -> 'metadata';
  v_lineage jsonb := p_resolution -> 'lineage';
  v_application_id uuid;
  v_company_id uuid;
  v_actor_user_id uuid;
  v_template_version_id uuid;
  v_correlation_id uuid;
  v_idempotency_key text;
  v_fingerprint text;
  v_technical_principal text;
  v_application public.development_template_applications%rowtype;
  v_attempt_id uuid := gen_random_uuid();
  v_attempt_number integer;
begin
  if jsonb_typeof(p_resolution) is distinct from 'object'
    or jsonb_typeof(v_snapshot) is distinct from 'object'
    or jsonb_typeof(v_metadata) is distinct from 'object'
    or jsonb_typeof(v_lineage) is distinct from 'object'
  then
    raise exception using errcode = '22023', message = 'DEVELOPMENT_TEMPLATE_PERSISTENCE_INVALID_RESOLUTION';
  end if;

  begin
    v_application_id := (v_snapshot #>> '{application,id}')::uuid;
    v_company_id := (v_snapshot #>> '{application,companyId}')::uuid;
    v_actor_user_id := (v_snapshot #>> '{application,actorUserId}')::uuid;
    v_template_version_id := (v_snapshot #>> '{template,versionId}')::uuid;
    v_correlation_id := (v_snapshot #>> '{application,correlationId}')::uuid;
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'DEVELOPMENT_TEMPLATE_PERSISTENCE_INVALID_IDENTITY';
  end;

  v_idempotency_key := v_snapshot #>> '{application,idempotencyKey}';
  v_fingerprint := p_resolution ->> 'fingerprint';
  v_technical_principal := v_snapshot #>> '{application,technicalPrincipal}';

  if nullif(btrim(v_idempotency_key), '') is null
    or nullif(btrim(v_fingerprint), '') is null
    or nullif(btrim(v_technical_principal), '') is null
    or v_metadata ->> 'idempotencyKey' is distinct from v_idempotency_key
    or v_metadata ->> 'correlationId' is distinct from v_correlation_id::text
    or v_metadata ->> 'actorUserId' is distinct from v_actor_user_id::text
    or v_metadata ->> 'technicalPrincipal' is distinct from v_technical_principal
    or v_lineage ->> 'applicationId' is distinct from v_application_id::text
    or v_lineage ->> 'companyId' is distinct from v_company_id::text
    or v_lineage ->> 'templateVersionId' is distinct from v_template_version_id::text
    or v_lineage ->> 'intentFingerprint' is distinct from v_fingerprint
  then
    raise exception using errcode = '22023', message = 'DEVELOPMENT_TEMPLATE_PERSISTENCE_RESOLUTION_MISMATCH';
  end if;

  if not public.can_apply_development_template_v1(
    v_company_id,
    v_actor_user_id,
    (v_snapshot #>> '{plan,employeeId}')::uuid,
    (v_snapshot #>> '{plan,ownerId}')::uuid
  ) then
    raise exception using errcode = '42501', message = 'DEVELOPMENT_TEMPLATE_PERSISTENCE_PERMISSION_DENIED';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':' || v_idempotency_key, 0)
  );

  select application.*
  into v_application
  from public.development_template_applications application
  where application.company_id = v_company_id
    and application.idempotency_key = v_idempotency_key
  for update;

  if found then
    select coalesce(max(attempt.attempt_number), 0) + 1
    into v_attempt_number
    from public.development_template_application_attempts attempt
    where attempt.application_id = v_application.id
      and attempt.company_id = v_company_id;

    if v_application.intent_fingerprint <> v_fingerprint then
      insert into public.development_template_application_attempts (
        id, application_id, company_id, attempt_number, status,
        error_code, started_at, completed_at
      ) values (
        v_attempt_id, v_application.id, v_company_id, v_attempt_number, 'failed',
        'IDEMPOTENCY_FINGERPRINT_CONFLICT', now(), now()
      );
      insert into public.development_template_application_audit (
        application_id, attempt_id, company_id, actor_user_id,
        technical_principal, operation, template_version_id, correlation_id,
        idempotency_key, intent_fingerprint, outcome, failure_code
      ) values (
        v_application.id, v_attempt_id, v_company_id, v_application.actor_user_id,
        v_application.technical_principal, 'conflict', v_application.template_version_id,
        v_application.correlation_id, v_idempotency_key, v_fingerprint,
        'conflict', 'IDEMPOTENCY_FINGERPRINT_CONFLICT'
      );
      return jsonb_build_object(
        'status', 'conflict',
        'applicationId', v_application.id,
        'failureCode', 'IDEMPOTENCY_FINGERPRINT_CONFLICT'
      );
    end if;

    if v_application.status = 'succeeded' then
      insert into public.development_template_application_attempts (
        id, application_id, company_id, attempt_number, status,
        started_at, completed_at
      ) values (
        v_attempt_id, v_application.id, v_company_id, v_attempt_number,
        'succeeded', now(), now()
      );
      insert into public.development_template_application_audit (
        application_id, attempt_id, company_id, actor_user_id,
        technical_principal, operation, template_version_id, correlation_id,
        idempotency_key, intent_fingerprint, outcome, plan_id, snapshot_id
      )
      select
        v_application.id, v_attempt_id, v_company_id, v_application.actor_user_id,
        v_application.technical_principal, 'retry', v_application.template_version_id,
        v_application.correlation_id, v_idempotency_key, v_fingerprint,
        'succeeded', v_application.result_plan_id, snapshot.id
      from public.development_template_application_snapshots snapshot
      where snapshot.application_id = v_application.id
        and snapshot.company_id = v_company_id;

      if not exists (
        select 1
        from public.development_template_application_snapshots snapshot
        where snapshot.application_id = v_application.id
          and snapshot.company_id = v_company_id
      ) then
        raise exception using
          errcode = '23514',
          message = 'DEVELOPMENT_TEMPLATE_SNAPSHOT_NOT_FOUND';
      end if;

return jsonb_build_object(
        'status', 'idempotent_retry',
        'applicationId', v_application.id,
        'planId', v_application.result_plan_id,
        'snapshotId', (
          select snapshot.id
          from public.development_template_application_snapshots snapshot
          where snapshot.application_id = v_application.id
            and snapshot.company_id = v_company_id
        )
      );
    end if;

    if v_application.status = 'failed' then
      insert into public.development_template_application_attempts (
        id, application_id, company_id, attempt_number, status,
        error_code, started_at, completed_at
      ) values (
        v_attempt_id, v_application.id, v_company_id, v_attempt_number, 'failed',
        v_application.failure_code, now(), now()
      );
      return jsonb_build_object(
        'status', 'known_failure',
        'applicationId', v_application.id,
        'failureCode', v_application.failure_code
      );
    end if;
  else
    insert into public.development_template_applications (
      id, company_id, template_version_id, actor_user_id,
      technical_principal, idempotency_key, intent_fingerprint,
      correlation_id, requested_at
    ) values (
      v_application_id, v_company_id, v_template_version_id, v_actor_user_id,
      v_technical_principal, v_idempotency_key, v_fingerprint,
      v_correlation_id, (v_snapshot #>> '{application,effectiveAt}')::timestamptz
    );
    v_application.id := v_application_id;
    v_attempt_number := 1;
  end if;

  insert into public.development_template_application_attempts (
    id, application_id, company_id, attempt_number, status, started_at
  ) values (
    v_attempt_id, v_application.id, v_company_id, v_attempt_number, 'running', now()
  );

  return jsonb_build_object(
    'status', 'acquired',
    'applicationId', v_application.id,
    'attemptId', v_attempt_id
  );
end;
$$;

create or replace function public.complete_development_template_application_v1(
  p_resolution jsonb,
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot jsonb := p_resolution -> 'snapshot';
  v_lineage jsonb := p_resolution -> 'lineage';
  v_company_id uuid := (v_snapshot #>> '{application,companyId}')::uuid;
  v_application_id uuid := (v_snapshot #>> '{application,id}')::uuid;
  v_actor_user_id uuid := (v_snapshot #>> '{application,actorUserId}')::uuid;
  v_template_version_id uuid := (v_snapshot #>> '{template,versionId}')::uuid;
  v_template_id uuid := (v_snapshot #>> '{template,id}')::uuid;
  v_idempotency_key text := v_snapshot #>> '{application,idempotencyKey}';
  v_fingerprint text := p_resolution ->> 'fingerprint';
  v_application public.development_template_applications%rowtype;
  v_goal jsonb;
  v_action jsonb;
  v_global jsonb;
  v_plan_id uuid := gen_random_uuid();
  v_goal_id uuid;
  v_snapshot_id uuid := gen_random_uuid();
  v_current_level integer;
begin
  if jsonb_typeof(p_resolution) is distinct from 'object'
    or jsonb_typeof(v_snapshot) is distinct from 'object'
    or jsonb_typeof(v_lineage) is distinct from 'object'
    or jsonb_typeof(p_resolution -> 'goals') is distinct from 'array'
    or jsonb_typeof(v_snapshot -> 'goals') is distinct from 'array'
    or p_resolution -> 'goals' is distinct from v_snapshot -> 'goals'
  then
    raise exception using errcode = '22023', message = 'DEVELOPMENT_TEMPLATE_PERSISTENCE_INVALID_RESOLUTION';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':' || v_idempotency_key, 0)
  );

  select application.*
  into v_application
  from public.development_template_applications application
  where application.id = v_application_id
    and application.company_id = v_company_id
    and application.idempotency_key = v_idempotency_key
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'DEVELOPMENT_TEMPLATE_APPLICATION_NOT_FOUND';
  end if;

  if v_application.intent_fingerprint <> v_fingerprint then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_FINGERPRINT_CONFLICT';
  end if;

  if not exists (
    select 1
    from public.development_template_application_attempts attempt
    where attempt.id = p_attempt_id
      and attempt.application_id = v_application.id
      and attempt.company_id = v_company_id
      and attempt.status = 'running'
  ) then
    raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_ATTEMPT_INVALID';
  end if;

  if v_application.status = 'succeeded' then
    update public.development_template_application_attempts
    set status = 'succeeded', completed_at = now()
    where id = p_attempt_id
      and application_id = v_application.id
      and company_id = v_company_id
      and status = 'running';
    return jsonb_build_object(
      'status', 'idempotent_retry',
      'applicationId', v_application.id,
      'planId', v_application.result_plan_id,
      'snapshotId', (
        select snapshot.id
        from public.development_template_application_snapshots snapshot
        where snapshot.application_id = v_application.id
          and snapshot.company_id = v_company_id
      )
    );
  end if;

  if v_application.status <> 'pending'
    or v_application.template_version_id <> v_template_version_id
    or v_application.actor_user_id <> v_actor_user_id
    or v_lineage ->> 'applicationId' is distinct from v_application_id::text
    or v_lineage ->> 'companyId' is distinct from v_company_id::text
    or v_lineage ->> 'templateVersionId' is distinct from v_template_version_id::text
    or v_lineage ->> 'templateId' is distinct from v_template_id::text
    or v_lineage ->> 'templateVersionNumber' is distinct from v_snapshot #>> '{template,versionNumber}'
    or v_lineage ->> 'scope' is distinct from v_snapshot #>> '{template,scope}'
    or v_lineage ->> 'snapshotFormatVersion' is distinct from v_snapshot ->> 'formatVersion'
    or v_lineage ->> 'intentFingerprint' is distinct from v_fingerprint
  then
    raise exception using errcode = '22023', message = 'DEVELOPMENT_TEMPLATE_PERSISTENCE_RESOLUTION_MISMATCH';
  end if;

  if not public.can_apply_development_template_v1(
    v_company_id,
    v_actor_user_id,
    (v_snapshot #>> '{plan,employeeId}')::uuid,
    (v_snapshot #>> '{plan,ownerId}')::uuid
  ) then
    raise exception using errcode = '42501', message = 'DEVELOPMENT_TEMPLATE_PERSISTENCE_PERMISSION_DENIED';
  end if;

  if not exists (
    select 1
    from public.development_template_versions version
    where version.id = v_template_version_id
      and version.template_id = v_template_id
      and version.status = 'published'
      and version.version_number = (v_snapshot #>> '{template,versionNumber}')::integer
      and version.scope = v_snapshot #>> '{template,scope}'
      and version.name = v_snapshot #>> '{template,name}'
      and version.description is not distinct from v_snapshot #>> '{template,description}'
      and version.suggested_duration_days is not distinct from
        (v_snapshot #>> '{template,suggestedDurationDays}')::integer
      and (
        (version.scope = 'global' and version.company_id is null)
        or (version.scope = 'company' and version.company_id = v_company_id)
      )
  ) then
    raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_VERSION_NOT_CONSUMABLE';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(p_resolution -> 'goals') resolved_goal
  ) <> (
    select count(*)
    from public.development_template_version_goals version_goal
    where version_goal.template_version_id = v_template_version_id
  ) or (
    select count(distinct resolved_goal ->> 'sourceGoalId')
    from jsonb_array_elements(p_resolution -> 'goals') resolved_goal
  ) <> (
    select count(*)
    from public.development_template_version_goals version_goal
    where version_goal.template_version_id = v_template_version_id
  ) then
    raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_VERSION_CONTENT_CHANGED';
  end if;

  if not exists (
    select 1 from public.people employee
    where employee.id = (v_snapshot #>> '{plan,employeeId}')::uuid
      and employee.company_id = v_company_id
      and employee.status <> 'terminated'
  ) then
    raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_EMPLOYEE_INVALID';
  end if;

  if v_snapshot #>> '{plan,ownerId}' is not null and not exists (
    select 1 from public.people owner
    where owner.id = (v_snapshot #>> '{plan,ownerId}')::uuid
      and owner.company_id = v_company_id
      and owner.status <> 'terminated'
  ) then
    raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_OWNER_INVALID';
  end if;

  for v_goal in select value from jsonb_array_elements(p_resolution -> 'goals')
  loop
    if not exists (
      select 1
      from public.development_template_version_goals version_goal
      where version_goal.id = (v_goal ->> 'sourceGoalId')::uuid
        and version_goal.template_version_id = v_template_version_id
        and version_goal.description is not distinct from v_goal ->> 'description'
        and version_goal.suggested_target_level =
          (v_goal ->> 'suggestedTargetLevel')::integer
        and version_goal.suggested_target_level =
          (v_goal ->> 'appliedTargetLevel')::integer
        and version_goal.order_index = (v_goal ->> 'orderIndex')::integer
        and (
          (
            version_goal.company_id = v_company_id
            and version_goal.competency_id = (v_goal #>> '{competency,id}')::uuid
            and version_goal.global_concept_version_id is null
            and (
              v_goal -> 'globalCompetency' is null
              or jsonb_typeof(v_goal -> 'globalCompetency') = 'null'
            )
          )
          or (
            version_goal.company_id is null
            and version_goal.competency_id is null
            and version_goal.global_concept_version_id =
              (v_goal #>> '{globalCompetency,requiredVersionId}')::uuid
          )
        )
    ) then
      raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_VERSION_CONTENT_CHANGED';
    end if;

    if jsonb_typeof(v_goal -> 'actions') is distinct from 'array'
      or (
        select count(*)
        from jsonb_array_elements(v_goal -> 'actions') resolved_action
      ) <> (
        select count(*)
        from public.development_template_version_actions version_action
        where version_action.template_version_goal_id =
          (v_goal ->> 'sourceGoalId')::uuid
      )
      or (
        select count(distinct resolved_action ->> 'sourceActionId')
        from jsonb_array_elements(v_goal -> 'actions') resolved_action
      ) <> (
        select count(*)
        from public.development_template_version_actions version_action
        where version_action.template_version_goal_id =
          (v_goal ->> 'sourceGoalId')::uuid
      )
      or exists (
        select 1
        from jsonb_array_elements(v_goal -> 'actions') resolved_action
        where not exists (
          select 1
          from public.development_template_version_actions version_action
          where version_action.id = (resolved_action ->> 'sourceActionId')::uuid
            and version_action.template_version_goal_id =
              (v_goal ->> 'sourceGoalId')::uuid
            and version_action.title = resolved_action ->> 'title'
            and version_action.description is not distinct from
              resolved_action ->> 'description'
            and version_action.type = resolved_action ->> 'type'
            and version_action.suggested_due_days is not distinct from
              (resolved_action ->> 'suggestedDueDays')::integer
            and version_action.order_index =
              (resolved_action ->> 'orderIndex')::integer
            and resolved_action ->> 'dueDate' is not distinct from
              case
                when version_action.suggested_due_days is null then null
                else (
                  (v_snapshot #>> '{plan,startDate}')::date
                  + version_action.suggested_due_days
                )::text
              end
        )
      )
    then
      raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_VERSION_CONTENT_CHANGED';
    end if;

    if not exists (
      select 1
      from public.competencies competency
      where competency.id = (v_goal #>> '{competency,id}')::uuid
        and competency.company_id = v_company_id
        and competency.active
        and competency.name = v_goal #>> '{competency,name}'
        and competency.expected_level = (v_goal ->> 'expectedLevel')::integer
    ) then
      raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_COMPETENCY_CHANGED';
    end if;

    select coalesce(max(employee_competency.current_level), 0)
    into v_current_level
    from public.employee_competencies employee_competency
    where employee_competency.company_id = v_company_id
      and employee_competency.employee_id = (v_snapshot #>> '{plan,employeeId}')::uuid
      and employee_competency.competency_id = (v_goal #>> '{competency,id}')::uuid
      and employee_competency.archived_at is null;

    if v_current_level <> (v_goal ->> 'currentLevel')::integer
      or (v_goal ->> 'appliedTargetLevel')::integer < v_current_level
    then
      raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_COMPETENCY_LEVEL_CHANGED';
    end if;

    v_global := v_goal -> 'globalCompetency';
    if v_global is not null and jsonb_typeof(v_global) <> 'null' then
      if not exists (
        select 1
        from public.tenant_competency_mappings mapping
        where mapping.id = (v_global ->> 'mappingId')::uuid
          and mapping.company_id = v_company_id
          and mapping.competency_id = (v_goal #>> '{competency,id}')::uuid
          and mapping.concept_version_id = (v_global ->> 'mappedConceptVersionId')::uuid
          and mapping.status = 'confirmed'
          and mapping.confirmed_by::text = v_global ->> 'confirmedBy'
          and mapping.confirmed_at = (v_global ->> 'confirmedAt')::timestamptz
      ) then
        raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_MAPPING_CHANGED';
      end if;

      if not exists (
        select 1
        from public.global_competency_concept_versions concept_version
        join public.global_competency_concepts concept
          on concept.id = concept_version.concept_id
        where concept_version.id = (v_global ->> 'requiredVersionId')::uuid
          and concept_version.status = 'published'
          and concept_version.concept_id = (v_global ->> 'conceptId')::uuid
          and concept_version.version_number =
            (v_global ->> 'requiredVersionNumber')::integer
          and concept.code = v_global ->> 'conceptCode'
      ) then
        raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_CONCEPT_VERSION_CHANGED';
      end if;

      if v_global -> 'compatibility' is not null
        and jsonb_typeof(v_global -> 'compatibility') <> 'null'
        and not exists (
          select 1
          from public.global_competency_concept_version_compatibilities compatibility
          where compatibility.id = (v_global #>> '{compatibility,declarationId}')::uuid
            and compatibility.required_version_id = (v_global ->> 'requiredVersionId')::uuid
            and compatibility.compatible_version_id = (v_global ->> 'mappedConceptVersionId')::uuid
        )
      then
        raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_COMPATIBILITY_CHANGED';
      end if;
    end if;
  end loop;

  insert into public.development_plans (
    id, company_id, employee_id, created_by, owner_id, template_id,
    title, description, status, priority, start_date, due_date, updated_at
  ) values (
    v_plan_id, v_company_id, (v_snapshot #>> '{plan,employeeId}')::uuid,
    v_actor_user_id, (v_snapshot #>> '{plan,ownerId}')::uuid, v_template_id,
    v_snapshot #>> '{template,name}', v_snapshot #>> '{template,description}',
    'active', v_snapshot #>> '{plan,priority}',
    (v_snapshot #>> '{plan,startDate}')::date,
    (v_snapshot #>> '{plan,dueDate}')::date, now()
  );

  for v_goal in select value from jsonb_array_elements(p_resolution -> 'goals')
  loop
    v_goal_id := gen_random_uuid();
    insert into public.development_goals (
      id, company_id, plan_id, competency_id, title, description,
      current_level, expected_level, target_level, status, updated_at
    ) values (
      v_goal_id, v_company_id, v_plan_id,
      (v_goal #>> '{competency,id}')::uuid,
      v_goal #>> '{competency,name}', v_goal ->> 'description',
      (v_goal ->> 'currentLevel')::integer,
      (v_goal ->> 'expectedLevel')::integer,
      (v_goal ->> 'appliedTargetLevel')::integer,
      'not_started', now()
    );

    for v_action in select value from jsonb_array_elements(v_goal -> 'actions')
    loop
      insert into public.development_actions (
        company_id, goal_id, title, description, type, status, due_date, updated_at
      ) values (
        v_company_id, v_goal_id, v_action ->> 'title',
        v_action ->> 'description', v_action ->> 'type', 'pending',
        (v_action ->> 'dueDate')::date, now()
      );
    end loop;
  end loop;

  update public.development_template_applications
  set status = 'succeeded', result_plan_id = v_plan_id,
      completed_at = now(), updated_at = now()
  where id = v_application.id and company_id = v_company_id;

  insert into public.development_template_application_snapshots (
    id, application_id, company_id, plan_id, format_version, snapshot
  ) values (
    v_snapshot_id, v_application.id, v_company_id, v_plan_id,
    (v_snapshot ->> 'formatVersion')::integer, v_snapshot
  );

  insert into public.development_template_application_lineage (
    application_id, snapshot_id, plan_id, template_version_id, company_id
  ) values (
    v_application.id, v_snapshot_id, v_plan_id, v_template_version_id, v_company_id
  );

  update public.development_template_application_attempts
  set status = 'succeeded', completed_at = now()
  where id = p_attempt_id
    and application_id = v_application.id
    and company_id = v_company_id
    and status = 'running';

  if not found then
    raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_ATTEMPT_INVALID';
  end if;

  insert into public.development_template_application_audit (
    application_id, attempt_id, company_id, actor_user_id,
    technical_principal, operation, template_version_id, correlation_id,
    idempotency_key, intent_fingerprint, outcome, plan_id, snapshot_id
  ) values (
    v_application.id, p_attempt_id, v_company_id, v_actor_user_id,
    v_application.technical_principal, 'persist', v_template_version_id,
    v_application.correlation_id, v_idempotency_key, v_fingerprint,
    'succeeded', v_plan_id, v_snapshot_id
  );

  return jsonb_build_object(
    'status', 'created',
    'applicationId', v_application.id,
    'planId', v_plan_id,
    'snapshotId', v_snapshot_id
  );
end;
$$;

create or replace function public.fail_development_template_application_v1(
  p_company_id uuid,
  p_application_id uuid,
  p_attempt_id uuid,
  p_fingerprint text,
  p_failure_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_application public.development_template_applications%rowtype;
begin
  if nullif(btrim(p_failure_code), '') is null then
    raise exception using errcode = '22023', message = 'DEVELOPMENT_TEMPLATE_FAILURE_CODE_REQUIRED';
  end if;

  select application.*
  into v_application
  from public.development_template_applications application
  where application.id = p_application_id
    and application.company_id = p_company_id
  for update;

  if not found or v_application.intent_fingerprint <> p_fingerprint then
    raise exception using errcode = '22023', message = 'DEVELOPMENT_TEMPLATE_FAILURE_CONTEXT_INVALID';
  end if;

  update public.development_template_application_attempts
  set status = 'failed', error_code = p_failure_code, completed_at = now()
  where id = p_attempt_id
    and application_id = p_application_id
    and company_id = p_company_id
    and status = 'running';

  if not found then
    raise exception using errcode = '23514', message = 'DEVELOPMENT_TEMPLATE_ATTEMPT_INVALID';
  end if;

  if v_application.status = 'pending' then
    update public.development_template_applications
    set status = 'failed', failure_code = p_failure_code,
        completed_at = now(), updated_at = now()
    where id = p_application_id and company_id = p_company_id;
  end if;

  insert into public.development_template_application_audit (
    application_id, attempt_id, company_id, actor_user_id,
    technical_principal, operation, template_version_id, correlation_id,
    idempotency_key, intent_fingerprint, outcome, failure_code
  ) values (
    p_application_id, p_attempt_id, p_company_id, v_application.actor_user_id,
    v_application.technical_principal, 'fail', v_application.template_version_id,
    v_application.correlation_id, v_application.idempotency_key,
    p_fingerprint, 'failed', p_failure_code
  );

  return jsonb_build_object(
    'status', 'known_failure',
    'applicationId', p_application_id,
    'failureCode', p_failure_code
  );
end;
$$;

revoke all on function public.can_apply_development_template_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;

-- ---------------------------------------------------------------------------
-- Purpose-bound template-version content read, for deterministic resolution.
--
-- 0131 revoked every direct privilege on the six template tables from
-- `authenticated`. That is deliberate and stays: a client must not read
-- template content by selecting a table. But the deterministic resolver runs
-- under the ACTOR's session, not service_role, and it needs the exact version,
-- goal and action rows in order to materialize a plan. Restoring SELECT would
-- reopen the surface D-DB1 just closed, and moving the resolver to service_role
-- would replace an authorization question with an unrestricted one. So the
-- content arrives through a boundary that answers the authorization question
-- first.
--
-- These functions live in 0132 rather than 0131 for two reasons: they exist FOR
-- the application engine, which is this migration's subject, and the manager
-- branch needs the direct-report relationship that 0132 introduces. A function
-- in 0131 could not call forward into it.
--
-- Three functions rather than one composite row type: each returns `setof` its
-- own table, so the resolver receives byte-identical columns to the direct
-- selects it replaces. That is what keeps the deterministic output unchanged —
-- a hand-written projection would be a new opportunity to drop or rename a
-- field the engine hashes.
-- ---------------------------------------------------------------------------

create function public.can_read_development_template_version_v1(
  p_version_id uuid, p_employee_id uuid
) returns boolean language sql security definer set search_path = public, pg_temp stable as $$
  select exists (
    select 1
    from public.development_template_versions v
    where v.id = p_version_id
      and (
        -- Administrative actors author and inspect: draft, published and
        -- obsolete alike, and without an employee in hand. A company-scoped
        -- version is the only kind they administer.
        (v.company_id is not null and public.development_actor_is_admin_v1(v.company_id))

        -- A manager reads content only to apply it, so the target employee is
        -- part of the authorization rather than a later check: without a
        -- current direct report there is nothing to read this content FOR.
        -- Draft content is never visible here — managers do not author.
        or (
          v.status = 'published'
          and p_employee_id is not null
          and exists (
            select 1
            from public.people employee
            join public.people actor
              on actor.company_id = employee.company_id
             and actor.user_id = auth.uid()
             and actor.status <> 'terminated'
            join public.company_members m
              on m.company_id = employee.company_id
             and m.user_id = auth.uid()
             and m.status = 'active'
             and m.role = 'manager'
            where employee.id = p_employee_id
              and employee.status <> 'terminated'
              and employee.manager_id = actor.id
              -- Consumable in the employee's tenant: the tenant's own version,
              -- or a global one. A different tenant's version is invisible.
              and (v.scope = 'global' or v.company_id = employee.company_id)
          )
        )
      )
  )
$$;

create function public.get_development_template_version_v1(
  p_version_id uuid, p_employee_id uuid default null
) returns setof public.development_template_versions
language sql security definer set search_path = public, pg_temp stable as $$
  select v.* from public.development_template_versions v
  where v.id = p_version_id
    and public.can_read_development_template_version_v1(p_version_id, p_employee_id)
$$;

create function public.get_development_template_version_goals_v1(
  p_version_id uuid, p_employee_id uuid default null
) returns setof public.development_template_version_goals
language sql security definer set search_path = public, pg_temp stable as $$
  select g.* from public.development_template_version_goals g
  where g.template_version_id = p_version_id
    and public.can_read_development_template_version_v1(p_version_id, p_employee_id)
  order by g.order_index, g.created_at, g.id
$$;

create function public.get_development_template_version_actions_v1(
  p_version_id uuid, p_employee_id uuid default null
) returns setof public.development_template_version_actions
language sql security definer set search_path = public, pg_temp stable as $$
  select a.*
  from public.development_template_version_actions a
  join public.development_template_version_goals g on g.id = a.template_version_goal_id
  where g.template_version_id = p_version_id
    and public.can_read_development_template_version_v1(p_version_id, p_employee_id)
  order by a.order_index, a.created_at, a.id
$$;

-- An unauthorized or nonexistent selector returns zero rows rather than an
-- error: the reader cannot tell "this version is not yours" from "there is no
-- such version", which is the same opacity every other D-DB1 read offers.
revoke all on function
  public.can_read_development_template_version_v1(uuid,uuid),
  public.get_development_template_version_v1(uuid,uuid),
  public.get_development_template_version_goals_v1(uuid,uuid),
  public.get_development_template_version_actions_v1(uuid,uuid)
from public, anon, authenticated, service_role;

-- The predicate stays internal; only the three readers are callable, and only
-- by an authenticated session whose identity the predicate re-derives.
grant execute on function
  public.get_development_template_version_v1(uuid,uuid),
  public.get_development_template_version_goals_v1(uuid,uuid),
  public.get_development_template_version_actions_v1(uuid,uuid)
to authenticated;

notify pgrst, 'reload schema';
