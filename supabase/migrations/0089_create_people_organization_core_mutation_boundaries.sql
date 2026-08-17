-- MVP Closure PR I1 — People + Organization core trusted mutations.
-- DB-first only: app consumers remain unchanged until the integration PR.

create or replace function public.require_people_organization_mutator(
  p_company_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.company_members membership
    where membership.company_id = p_company_id
      and membership.user_id = v_actor
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'hr')
  ) then
    raise exception using errcode = '42501', message = 'TENANT_AUTHORIZATION_DENIED';
  end if;

  return v_actor;
end;
$$;

create or replace function public.append_people_organization_activity(
  p_company_id uuid,
  p_activity_type text,
  p_module text,
  p_title text,
  p_description text,
  p_entity_type text,
  p_entity_id uuid,
  p_subject_type text default null,
  p_subject_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  insert into public.activity_events (
    company_id, activity_type, module, title, description,
    actor_type, actor_id, entity_type, entity_id,
    subject_type, subject_id, visibility, metadata, idempotency_key
  ) values (
    p_company_id, p_activity_type, p_module, p_title, p_description,
    'user', auth.uid(), p_entity_type, p_entity_id,
    p_subject_type, p_subject_id, 'company', coalesce(p_metadata, '{}'::jsonb),
    p_idempotency_key
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.create_tenant_person_v1(
  p_company_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_birth_date date,
  p_hire_date date,
  p_status text,
  p_team_id uuid,
  p_position_id uuid,
  p_manager_id uuid,
  p_disc_profile text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_person_id uuid;
  v_name text := btrim(p_full_name);
  v_email text := nullif(btrim(p_email), '');
  v_phone text := nullif(btrim(p_phone), '');
  v_key text := 'core:person:create:' || btrim(p_idempotency_key);
  v_fingerprint text;
  v_existing public.activity_events%rowtype;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);

  if v_name is null or char_length(v_name) < 2
    or nullif(btrim(p_idempotency_key), '') is null
    or char_length(btrim(p_idempotency_key)) > 200
    or p_status not in ('active', 'inactive', 'on_leave', 'terminated')
    or (v_email is not null and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (p_disc_profile is not null and p_disc_profile not in (
      'D','I','S','C','ID','IS','IC','DI','DS','DC','SI','SD','SC','CI','CD','CS'
    ))
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  if p_team_id is not null and not exists (
    select 1 from public.teams
    where id = p_team_id and company_id = p_company_id and deleted_at is null
  ) then
    raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID';
  end if;
  if p_position_id is not null and not exists (
    select 1 from public.positions
    where id = p_position_id and company_id = p_company_id and deleted_at is null
  ) then
    raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID';
  end if;
  if p_manager_id is not null and not exists (
    select 1 from public.people
    where id = p_manager_id and company_id = p_company_id and status <> 'terminated'
  ) then
    raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID';
  end if;

  v_fingerprint := encode(extensions.digest(jsonb_build_object(
    'fullName', v_name, 'email', v_email, 'phone', v_phone,
    'birthDate', p_birth_date, 'hireDate', p_hire_date, 'status', p_status,
    'teamId', p_team_id, 'positionId', p_position_id,
    'managerId', p_manager_id, 'discProfile', p_disc_profile
  )::text, 'sha256'), 'hex');

  perform pg_advisory_xact_lock(hashtextextended(
    p_company_id::text || ':' || v_actor::text || ':' || v_key, 0
  ));

  select * into v_existing
  from public.activity_events
  where company_id = p_company_id and idempotency_key = v_key;

  if found then
    if v_existing.activity_type <> 'employee.created'
      or v_existing.metadata ->> 'intentFingerprint' <> v_fingerprint
    then
      raise exception using errcode = '23505', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'status', 'idempotent_retry', 'personId', v_existing.entity_id
    );
  end if;

  insert into public.people (
    company_id, full_name, email, phone, birth_date, hire_date, status,
    team_id, position_id, manager_id, disc_profile, updated_at
  ) values (
    p_company_id, v_name, v_email, v_phone, p_birth_date, p_hire_date, p_status,
    p_team_id, p_position_id, p_manager_id, p_disc_profile, now()
  ) returning id into v_person_id;

  perform public.append_people_organization_activity(
    p_company_id, 'employee.created', 'people', 'Colaborador criado',
    'O colaborador ' || v_name || ' foi criado.', 'employee', v_person_id,
    'employee', v_person_id,
    jsonb_build_object(
      'employeeId', v_person_id, 'employeeName', v_name, 'status', p_status,
      'teamId', p_team_id, 'positionId', p_position_id, 'managerId', p_manager_id,
      'hireDate', p_hire_date, 'intentFingerprint', v_fingerprint
    ), v_key
  );

  return jsonb_build_object('status', 'succeeded', 'personId', v_person_id);
end;
$$;

create or replace function public.update_tenant_person_v1(
  p_company_id uuid,
  p_person_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_birth_date date,
  p_hire_date date,
  p_status text,
  p_team_id uuid,
  p_position_id uuid,
  p_manager_id uuid,
  p_disc_profile text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_actor_role text;
  v_person public.people%rowtype;
  v_membership public.company_members%rowtype;
  v_name text := btrim(p_full_name);
  v_email text := nullif(btrim(p_email), '');
  v_phone text := nullif(btrim(p_phone), '');
  v_access_deactivated boolean := false;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);
  select role into v_actor_role from public.company_members
  where company_id = p_company_id and user_id = v_actor and status = 'active';

  select * into v_person from public.people
  where id = p_person_id and company_id = p_company_id and status <> 'terminated'
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'PERSON_NOT_FOUND';
  end if;

  if v_name is null or char_length(v_name) < 2
    or p_status not in ('active', 'inactive', 'on_leave', 'terminated')
    or (v_email is not null and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (p_disc_profile is not null and p_disc_profile not in (
      'D','I','S','C','ID','IS','IC','DI','DS','DC','SI','SD','SC','CI','CD','CS'
    ))
    or p_manager_id = p_person_id
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  if p_team_id is not null and not exists (
    select 1 from public.teams
    where id = p_team_id and company_id = p_company_id and deleted_at is null
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;
  if p_position_id is not null and not exists (
    select 1 from public.positions
    where id = p_position_id and company_id = p_company_id and deleted_at is null
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;
  if p_manager_id is not null and not exists (
    select 1 from public.people
    where id = p_manager_id and company_id = p_company_id and status <> 'terminated'
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;

  if p_status = 'terminated' and v_person.user_id is not null then
    select * into v_membership from public.company_members
    where company_id = p_company_id and user_id = v_person.user_id and status = 'active'
    for update;
    if found then
      if v_membership.role = 'owner' and v_actor_role <> 'owner' then
        raise exception using errcode = '42501', message = 'PERSON_ACCESS_CONFLICT';
      end if;
      if v_membership.role = 'owner' and (
        select count(*) from public.company_members
        where company_id = p_company_id and role = 'owner' and status = 'active'
      ) <= 1 then
        raise exception using errcode = '23514', message = 'PERSON_ACCESS_CONFLICT';
      end if;
      update public.company_members set status = 'inactive'
      where id = v_membership.id;
      v_access_deactivated := true;
    end if;
  end if;

  update public.people set
    full_name = v_name, email = v_email, phone = v_phone,
    birth_date = p_birth_date, hire_date = p_hire_date, status = p_status,
    team_id = p_team_id, position_id = p_position_id,
    manager_id = p_manager_id, disc_profile = p_disc_profile, updated_at = now()
  where id = p_person_id and company_id = p_company_id;

  perform public.append_people_organization_activity(
    p_company_id, 'employee.updated', 'people', 'Colaborador atualizado',
    'Os dados de ' || v_name || ' foram atualizados.', 'employee', p_person_id,
    'employee', p_person_id,
    jsonb_build_object(
      'employeeId', p_person_id, 'employeeName', v_name,
      'previousEmployeeName', v_person.full_name,
      'status', p_status, 'previousStatus', v_person.status,
      'teamId', p_team_id, 'previousTeamId', v_person.team_id,
      'positionId', p_position_id, 'previousPositionId', v_person.position_id,
      'managerId', p_manager_id, 'previousManagerId', v_person.manager_id,
      'accessDeactivated', v_access_deactivated
    )
  );

  return jsonb_build_object(
    'status', 'succeeded', 'personId', p_person_id,
    'accessDeactivated', v_access_deactivated
  );
end;
$$;

create or replace function public.archive_tenant_person_v1(
  p_company_id uuid,
  p_person_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_actor_role text;
  v_person public.people%rowtype;
  v_membership public.company_members%rowtype;
  v_access_deactivated boolean := false;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);
  select role into v_actor_role from public.company_members
  where company_id = p_company_id and user_id = v_actor and status = 'active';

  select * into v_person from public.people
  where id = p_person_id and company_id = p_company_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'PERSON_NOT_FOUND';
  end if;
  if v_person.status = 'terminated' then
    return jsonb_build_object(
      'status', 'already_archived', 'personId', p_person_id,
      'accessDeactivated', false
    );
  end if;

  if v_person.user_id is not null then
    select * into v_membership from public.company_members
    where company_id = p_company_id and user_id = v_person.user_id and status = 'active'
    for update;
    if found then
      if v_membership.role = 'owner' and v_actor_role <> 'owner' then
        raise exception using errcode = '42501', message = 'PERSON_ACCESS_CONFLICT';
      end if;
      if v_membership.role = 'owner' and (
        select count(*) from public.company_members
        where company_id = p_company_id and role = 'owner' and status = 'active'
      ) <= 1 then
        raise exception using errcode = '23514', message = 'PERSON_ACCESS_CONFLICT';
      end if;
      update public.company_members set status = 'inactive'
      where id = v_membership.id;
      v_access_deactivated := true;
    end if;
  end if;

  update public.people set status = 'terminated', updated_at = now()
  where id = p_person_id and company_id = p_company_id;

  perform public.append_people_organization_activity(
    p_company_id, 'employee.archived', 'people', 'Colaborador arquivado',
    'O colaborador ' || v_person.full_name || ' foi arquivado.',
    'employee', p_person_id, 'employee', p_person_id,
    jsonb_build_object(
      'employeeId', p_person_id, 'employeeName', v_person.full_name,
      'previousStatus', v_person.status, 'status', 'terminated',
      'teamId', v_person.team_id, 'positionId', v_person.position_id,
      'managerId', v_person.manager_id,
      'accessDeactivated', v_access_deactivated,
      'membershipId', case when v_access_deactivated then v_membership.id else null end
    )
  );

  return jsonb_build_object(
    'status', 'succeeded', 'personId', p_person_id,
    'accessDeactivated', v_access_deactivated
  );
end;
$$;

create or replace function public.create_tenant_department_v1(
  p_company_id uuid,
  p_name text,
  p_description text,
  p_manager_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_id uuid;
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
  v_key text := 'core:department:create:' || btrim(p_idempotency_key);
  v_fingerprint text;
  v_existing public.activity_events%rowtype;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);
  if v_name is null or char_length(v_name) not between 2 and 100
    or (v_description is not null and char_length(v_description) > 255)
    or nullif(btrim(p_idempotency_key), '') is null
    or char_length(btrim(p_idempotency_key)) > 200
  then raise exception using errcode = '22023', message = 'VALIDATION_FAILED'; end if;
  if p_manager_id is not null and not exists (
    select 1 from public.people where id = p_manager_id
      and company_id = p_company_id and status <> 'terminated'
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;

  v_fingerprint := encode(extensions.digest(jsonb_build_object(
    'name', v_name, 'description', v_description, 'managerId', p_manager_id
  )::text, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(
    p_company_id::text || ':' || v_actor::text || ':' || v_key, 0
  ));
  select * into v_existing from public.activity_events
  where company_id = p_company_id and idempotency_key = v_key;
  if found then
    if v_existing.activity_type <> 'department.created'
      or v_existing.metadata ->> 'intentFingerprint' <> v_fingerprint
    then raise exception using errcode = '23505', message = 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('status', 'idempotent_retry', 'departmentId', v_existing.entity_id);
  end if;

  begin
    insert into public.departments (company_id, name, description, manager_id)
    values (p_company_id, v_name, v_description, p_manager_id)
    returning id into v_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  perform public.append_people_organization_activity(
    p_company_id, 'department.created', 'organization', 'Departamento criado',
    'O departamento ' || v_name || ' foi criado.', 'department', v_id,
    null, null,
    jsonb_build_object(
      'departmentId', v_id, 'departmentName', v_name,
      'managerId', p_manager_id, 'intentFingerprint', v_fingerprint
    ), v_key
  );
  return jsonb_build_object('status', 'succeeded', 'departmentId', v_id);
end;
$$;

create or replace function public.update_tenant_department_v1(
  p_company_id uuid,
  p_department_id uuid,
  p_name text,
  p_description text,
  p_manager_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.departments%rowtype;
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
begin
  perform public.require_people_organization_mutator(p_company_id);
  select * into v_current from public.departments
  where id = p_department_id and company_id = p_company_id and deleted_at is null
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'ORGANIZATION_ENTITY_NOT_FOUND'; end if;
  if v_name is null or char_length(v_name) not between 2 and 100
    or (v_description is not null and char_length(v_description) > 255)
  then raise exception using errcode = '22023', message = 'VALIDATION_FAILED'; end if;
  if p_manager_id is not null and not exists (
    select 1 from public.people where id = p_manager_id
      and company_id = p_company_id and status <> 'terminated'
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;
  begin
    update public.departments set name = v_name, description = v_description,
      manager_id = p_manager_id, updated_at = now()
    where id = p_department_id and company_id = p_company_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;
  perform public.append_people_organization_activity(
    p_company_id, 'department.updated', 'organization', 'Departamento atualizado',
    'O departamento ' || v_name || ' foi atualizado.', 'department', p_department_id,
    null, null, jsonb_build_object(
      'departmentId', p_department_id, 'departmentName', v_name,
      'previousDepartmentName', v_current.name, 'managerId', p_manager_id,
      'previousManagerId', v_current.manager_id
    )
  );
  return jsonb_build_object('status', 'succeeded', 'departmentId', p_department_id);
end;
$$;

create or replace function public.archive_tenant_department_v1(
  p_company_id uuid,
  p_department_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_current public.departments%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);
  select * into v_current from public.departments
  where id = p_department_id and company_id = p_company_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'ORGANIZATION_ENTITY_NOT_FOUND'; end if;
  if v_current.deleted_at is not null then
    return jsonb_build_object('status', 'already_archived', 'departmentId', p_department_id);
  end if;
  update public.departments set deleted_at = now(), updated_at = now()
  where id = p_department_id and company_id = p_company_id;
  perform public.append_people_organization_activity(
    p_company_id, 'department.archived', 'organization', 'Departamento arquivado',
    'O departamento ' || v_current.name || ' foi arquivado.',
    'department', p_department_id, null, null,
    jsonb_build_object('departmentId', p_department_id, 'departmentName', v_current.name)
  );
  return jsonb_build_object('status', 'succeeded', 'departmentId', p_department_id);
end;
$$;

create or replace function public.create_tenant_team_v1(
  p_company_id uuid,
  p_name text,
  p_description text,
  p_department_id uuid,
  p_parent_team_id uuid,
  p_manager_id uuid,
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
  v_key text := 'core:team:create:' || btrim(p_idempotency_key);
  v_fingerprint text;
  v_existing public.activity_events%rowtype;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);
  if v_name is null or char_length(v_name) not between 2 and 100
    or (v_description is not null and char_length(v_description) > 255)
    or nullif(btrim(p_idempotency_key), '') is null
    or char_length(btrim(p_idempotency_key)) > 200
  then raise exception using errcode = '22023', message = 'VALIDATION_FAILED'; end if;
  if p_department_id is not null and not exists (
    select 1 from public.departments where id = p_department_id
      and company_id = p_company_id and deleted_at is null
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;
  if p_parent_team_id is not null and not exists (
    select 1 from public.teams where id = p_parent_team_id
      and company_id = p_company_id and deleted_at is null
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;
  if p_manager_id is not null and not exists (
    select 1 from public.people where id = p_manager_id
      and company_id = p_company_id and status <> 'terminated'
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;

  v_fingerprint := encode(extensions.digest(jsonb_build_object(
    'name', v_name, 'description', v_description, 'departmentId', p_department_id,
    'parentTeamId', p_parent_team_id, 'managerId', p_manager_id
  )::text, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(
    p_company_id::text || ':' || v_actor::text || ':' || v_key, 0
  ));
  select * into v_existing from public.activity_events
  where company_id = p_company_id and idempotency_key = v_key;
  if found then
    if v_existing.activity_type <> 'team.created'
      or v_existing.metadata ->> 'intentFingerprint' <> v_fingerprint
    then raise exception using errcode = '23505', message = 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('status', 'idempotent_retry', 'teamId', v_existing.entity_id);
  end if;
  insert into public.teams (
    company_id, name, description, department_id, parent_team_id, manager_id
  ) values (
    p_company_id, v_name, v_description, p_department_id, p_parent_team_id, p_manager_id
  ) returning id into v_id;
  perform public.append_people_organization_activity(
    p_company_id, 'team.created', 'organization', 'Time criado',
    'O time ' || v_name || ' foi criado.', 'team', v_id, null, null,
    jsonb_build_object(
      'teamId', v_id, 'teamName', v_name, 'departmentId', p_department_id,
      'parentTeamId', p_parent_team_id, 'managerId', p_manager_id,
      'intentFingerprint', v_fingerprint
    ), v_key
  );
  return jsonb_build_object('status', 'succeeded', 'teamId', v_id);
end;
$$;

create or replace function public.update_tenant_team_v1(
  p_company_id uuid,
  p_team_id uuid,
  p_name text,
  p_description text,
  p_department_id uuid,
  p_parent_team_id uuid,
  p_manager_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.teams%rowtype;
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
begin
  perform public.require_people_organization_mutator(p_company_id);
  select * into v_current from public.teams
  where id = p_team_id and company_id = p_company_id and deleted_at is null
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'ORGANIZATION_ENTITY_NOT_FOUND'; end if;
  if v_name is null or char_length(v_name) not between 2 and 100
    or (v_description is not null and char_length(v_description) > 255)
    or p_parent_team_id = p_team_id
  then raise exception using errcode = '22023', message = 'VALIDATION_FAILED'; end if;
  if p_department_id is not null and not exists (
    select 1 from public.departments where id = p_department_id
      and company_id = p_company_id and deleted_at is null
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;
  if p_parent_team_id is not null and not exists (
    select 1 from public.teams where id = p_parent_team_id
      and company_id = p_company_id and deleted_at is null
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;
  if p_parent_team_id is not null and exists (
    with recursive descendants as (
      select id from public.teams
      where parent_team_id = p_team_id and company_id = p_company_id and deleted_at is null
      union all
      select child.id from public.teams child
      join descendants parent on child.parent_team_id = parent.id
      where child.company_id = p_company_id and child.deleted_at is null
    ) select 1 from descendants where id = p_parent_team_id
  ) then raise exception using errcode = '23514', message = 'ORGANIZATION_HIERARCHY_CYCLE'; end if;
  if p_manager_id is not null and not exists (
    select 1 from public.people where id = p_manager_id
      and company_id = p_company_id and status <> 'terminated'
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;
  update public.teams set name = v_name, description = v_description,
    department_id = p_department_id, parent_team_id = p_parent_team_id,
    manager_id = p_manager_id, updated_at = now()
  where id = p_team_id and company_id = p_company_id;
  perform public.append_people_organization_activity(
    p_company_id, 'team.updated', 'organization', 'Time atualizado',
    'O time ' || v_name || ' foi atualizado.', 'team', p_team_id, null, null,
    jsonb_build_object(
      'teamId', p_team_id, 'teamName', v_name, 'previousTeamName', v_current.name,
      'departmentId', p_department_id, 'previousDepartmentId', v_current.department_id,
      'parentTeamId', p_parent_team_id, 'previousParentTeamId', v_current.parent_team_id,
      'managerId', p_manager_id, 'previousManagerId', v_current.manager_id
    )
  );
  return jsonb_build_object('status', 'succeeded', 'teamId', p_team_id);
end;
$$;

create or replace function public.archive_tenant_team_v1(
  p_company_id uuid,
  p_team_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_current public.teams%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);
  select * into v_current from public.teams
  where id = p_team_id and company_id = p_company_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'ORGANIZATION_ENTITY_NOT_FOUND'; end if;
  if v_current.deleted_at is not null then
    return jsonb_build_object('status', 'already_archived', 'teamId', p_team_id);
  end if;
  update public.teams set deleted_at = now(), updated_at = now()
  where id = p_team_id and company_id = p_company_id;
  perform public.append_people_organization_activity(
    p_company_id, 'team.archived', 'organization', 'Time arquivado',
    'O time ' || v_current.name || ' foi arquivado.', 'team', p_team_id, null, null,
    jsonb_build_object(
      'teamId', p_team_id, 'teamName', v_current.name,
      'departmentId', v_current.department_id, 'parentTeamId', v_current.parent_team_id,
      'managerId', v_current.manager_id
    )
  );
  return jsonb_build_object('status', 'succeeded', 'teamId', p_team_id);
end;
$$;

create or replace function public.create_tenant_position_v1(
  p_company_id uuid,
  p_name text,
  p_description text,
  p_department_id uuid,
  p_hierarchical_level text,
  p_status text,
  p_weekly_workload_hours integer,
  p_work_model text,
  p_employment_type text,
  p_travel_requirement text,
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
  v_key text := 'core:position:create:' || btrim(p_idempotency_key);
  v_fingerprint text;
  v_existing public.activity_events%rowtype;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);
  if v_name is null or char_length(v_name) not between 2 and 100
    or (v_description is not null and char_length(v_description) > 255)
    or p_hierarchical_level not in ('intern','assistant','analyst','specialist','coordinator','supervisor','manager','director','executive')
    or p_status not in ('draft','active','inactive','obsolete')
    or p_weekly_workload_hours not between 1 and 168
    or p_work_model not in ('on_site','hybrid','remote')
    or p_employment_type not in ('clt','pj','intern','apprentice','temporary','outsourced','contractor','other')
    or p_travel_requirement not in ('none','occasional','frequent')
    or nullif(btrim(p_idempotency_key), '') is null
    or char_length(btrim(p_idempotency_key)) > 200
  then raise exception using errcode = '22023', message = 'VALIDATION_FAILED'; end if;
  if p_department_id is not null and not exists (
    select 1 from public.departments where id = p_department_id
      and company_id = p_company_id and deleted_at is null
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;
  v_fingerprint := encode(extensions.digest(jsonb_build_object(
    'name', v_name, 'description', v_description, 'departmentId', p_department_id,
    'hierarchicalLevel', p_hierarchical_level, 'status', p_status,
    'weeklyWorkloadHours', p_weekly_workload_hours, 'workModel', p_work_model,
    'employmentType', p_employment_type, 'travelRequirement', p_travel_requirement
  )::text, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(
    p_company_id::text || ':' || v_actor::text || ':' || v_key, 0
  ));
  select * into v_existing from public.activity_events
  where company_id = p_company_id and idempotency_key = v_key;
  if found then
    if v_existing.activity_type <> 'position.created'
      or v_existing.metadata ->> 'intentFingerprint' <> v_fingerprint
    then raise exception using errcode = '23505', message = 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('status', 'idempotent_retry', 'positionId', v_existing.entity_id);
  end if;
  insert into public.positions (
    company_id, name, description, department_id, hierarchical_level, status,
    weekly_workload_hours, work_model, employment_type, travel_requirement
  ) values (
    p_company_id, v_name, v_description, p_department_id, p_hierarchical_level, p_status,
    p_weekly_workload_hours, p_work_model, p_employment_type, p_travel_requirement
  ) returning id into v_id;
  perform public.append_people_organization_activity(
    p_company_id, 'position.created', 'organization', 'Cargo criado',
    'O cargo ' || v_name || ' foi criado.', 'position', v_id, null, null,
    jsonb_build_object(
      'positionId', v_id, 'positionName', v_name, 'departmentId', p_department_id,
      'hierarchicalLevel', p_hierarchical_level, 'status', p_status,
      'intentFingerprint', v_fingerprint
    ), v_key
  );
  return jsonb_build_object('status', 'succeeded', 'positionId', v_id);
end;
$$;

create or replace function public.update_tenant_position_v1(
  p_company_id uuid,
  p_position_id uuid,
  p_name text,
  p_description text,
  p_department_id uuid,
  p_hierarchical_level text,
  p_status text,
  p_weekly_workload_hours integer,
  p_work_model text,
  p_employment_type text,
  p_travel_requirement text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.positions%rowtype;
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
begin
  perform public.require_people_organization_mutator(p_company_id);
  select * into v_current from public.positions
  where id = p_position_id and company_id = p_company_id and deleted_at is null
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'ORGANIZATION_ENTITY_NOT_FOUND'; end if;
  if v_name is null or char_length(v_name) not between 2 and 100
    or (v_description is not null and char_length(v_description) > 255)
    or p_hierarchical_level not in ('intern','assistant','analyst','specialist','coordinator','supervisor','manager','director','executive')
    or p_status not in ('draft','active','inactive','obsolete')
    or p_weekly_workload_hours not between 1 and 168
    or p_work_model not in ('on_site','hybrid','remote')
    or p_employment_type not in ('clt','pj','intern','apprentice','temporary','outsourced','contractor','other')
    or p_travel_requirement not in ('none','occasional','frequent')
  then raise exception using errcode = '22023', message = 'VALIDATION_FAILED'; end if;
  if p_department_id is not null and not exists (
    select 1 from public.departments where id = p_department_id
      and company_id = p_company_id and deleted_at is null
  ) then raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID'; end if;
  update public.positions set
    name = v_name, description = v_description, department_id = p_department_id,
    hierarchical_level = p_hierarchical_level, status = p_status,
    weekly_workload_hours = p_weekly_workload_hours, work_model = p_work_model,
    employment_type = p_employment_type, travel_requirement = p_travel_requirement,
    updated_at = now()
  where id = p_position_id and company_id = p_company_id;
  perform public.append_people_organization_activity(
    p_company_id, 'position.updated', 'organization', 'Cargo atualizado',
    'O cargo ' || v_name || ' foi atualizado.', 'position', p_position_id, null, null,
    jsonb_build_object(
      'positionId', p_position_id, 'positionName', v_name,
      'previousPositionName', v_current.name, 'departmentId', p_department_id,
      'previousDepartmentId', v_current.department_id,
      'hierarchicalLevel', p_hierarchical_level,
      'previousHierarchicalLevel', v_current.hierarchical_level,
      'status', p_status, 'previousStatus', v_current.status
    )
  );
  return jsonb_build_object('status', 'succeeded', 'positionId', p_position_id);
end;
$$;

create or replace function public.archive_tenant_position_v1(
  p_company_id uuid,
  p_position_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_current public.positions%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);
  select * into v_current from public.positions
  where id = p_position_id and company_id = p_company_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'ORGANIZATION_ENTITY_NOT_FOUND'; end if;
  if v_current.deleted_at is not null then
    return jsonb_build_object('status', 'already_archived', 'positionId', p_position_id);
  end if;
  update public.positions set deleted_at = now(), updated_at = now()
  where id = p_position_id and company_id = p_company_id;
  perform public.append_people_organization_activity(
    p_company_id, 'position.archived', 'organization', 'Cargo arquivado',
    'O cargo ' || v_current.name || ' foi arquivado.',
    'position', p_position_id, null, null,
    jsonb_build_object(
      'positionId', p_position_id, 'positionName', v_current.name,
      'departmentId', v_current.department_id,
      'hierarchicalLevel', v_current.hierarchical_level, 'status', v_current.status
    )
  );
  return jsonb_build_object('status', 'succeeded', 'positionId', p_position_id);
end;
$$;

revoke all on function public.require_people_organization_mutator(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.append_people_organization_activity(
  uuid, text, text, text, text, text, uuid, text, uuid, jsonb, text
) from public, anon, authenticated, service_role;

revoke all on function public.create_tenant_person_v1(
  uuid, text, text, text, date, date, text, uuid, uuid, uuid, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_person_v1(
  uuid, uuid, text, text, text, date, date, text, uuid, uuid, uuid, text
) from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_person_v1(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.create_tenant_department_v1(uuid, text, text, uuid, text)
from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_department_v1(uuid, uuid, text, text, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_department_v1(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.create_tenant_team_v1(uuid, text, text, uuid, uuid, uuid, text)
from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_team_v1(uuid, uuid, text, text, uuid, uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_team_v1(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.create_tenant_position_v1(
  uuid, text, text, uuid, text, text, integer, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_position_v1(
  uuid, uuid, text, text, uuid, text, text, integer, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_position_v1(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.create_tenant_person_v1(
  uuid, text, text, text, date, date, text, uuid, uuid, uuid, text, text
) to authenticated;
grant execute on function public.update_tenant_person_v1(
  uuid, uuid, text, text, text, date, date, text, uuid, uuid, uuid, text
) to authenticated;
grant execute on function public.archive_tenant_person_v1(uuid, uuid)
to authenticated;
grant execute on function public.create_tenant_department_v1(uuid, text, text, uuid, text)
to authenticated;
grant execute on function public.update_tenant_department_v1(uuid, uuid, text, text, uuid)
to authenticated;
grant execute on function public.archive_tenant_department_v1(uuid, uuid)
to authenticated;
grant execute on function public.create_tenant_team_v1(uuid, text, text, uuid, uuid, uuid, text)
to authenticated;
grant execute on function public.update_tenant_team_v1(uuid, uuid, text, text, uuid, uuid, uuid)
to authenticated;
grant execute on function public.archive_tenant_team_v1(uuid, uuid)
to authenticated;
grant execute on function public.create_tenant_position_v1(
  uuid, text, text, uuid, text, text, integer, text, text, text, text
) to authenticated;
grant execute on function public.update_tenant_position_v1(
  uuid, uuid, text, text, uuid, text, text, integer, text, text, text
) to authenticated;
grant execute on function public.archive_tenant_position_v1(uuid, uuid)
to authenticated;

comment on function public.archive_tenant_person_v1(uuid, uuid) is
  'Terminates a tenant Person and atomically deactivates linked active access when ownership invariants allow it. It never deletes or unlinks identity history.';

notify pgrst, 'reload schema';
