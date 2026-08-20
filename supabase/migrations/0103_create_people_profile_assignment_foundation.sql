-- Career / Seniority + Position Taxonomy — Slice 3A: People profile assignment.
--
-- PD-021 (Approved) + ADR-0017 (Accepted). DB-first, DB-only.
--
-- Adds people.position_seniority_profile_id as the additive lotação authority,
-- kept COHERENT with people.position_id: for a person on a position, the profile
-- is that position's BASE profile (seniority_level_id IS NULL, active). position_id
-- is NOT removed (compatibility). The existing create/update_tenant_person_v1
-- boundaries remain the single write authority — their SIGNATURES are unchanged;
-- they are evolved internally (CREATE OR REPLACE) to derive and persist the base
-- profile atomically. Specific-seniority assignment (Jr/Pleno/Sr for a person) and
-- any Team∈Department invariant are DEFERRED (Slice 3B / a future Product Decision).
--
-- No department_id column (department stays derived). No change to team_id /
-- manager_id validation. No Recruitment / Competency Matrix change. No table
-- grants. 0089/0102 are not edited; the v1 bodies are replaced here forward-only.

-- Column + tenant-safe FK -----------------------------------------------------
alter table public.people
  add column if not exists position_seniority_profile_id uuid;

alter table public.people
  add constraint people_position_seniority_profile_company_fkey
    foreign key (position_seniority_profile_id, company_id)
    references public.position_seniority_profiles(id, company_id)
    on delete restrict;

create index if not exists people_position_seniority_profile_id_idx
  on public.people(position_seniority_profile_id);

-- Structural invariant: every LIVE position must have exactly one active base
-- profile. 0102 backfilled the positions that existed when it ran, but positions
-- created afterwards (via create_tenant_position_v1, evolved below) had none — so
-- the person boundaries could fail closed on a legitimately-created cargo. This
-- defensive backfill closes the 0102->0103 deployment window: it gives a base
-- profile to any live position still missing one. Same live-position semantics as
-- 0102 (deleted_at is null). Deterministic, idempotent, tenant-safe, no Activity.
-- Runs BEFORE the people backfill so every valid position resolves.
insert into public.position_seniority_profiles (company_id, position_id, seniority_level_id, active)
select p.company_id, p.id, null, true
from public.positions p
where p.deleted_at is null
  and not exists (
    select 1 from public.position_seniority_profiles pr
    where pr.position_id = p.id
      and pr.seniority_level_id is null
      and pr.active
  );

-- Backfill: position_id -> that position's active base profile. Deterministic,
-- idempotent (only fills NULLs), tenant-safe, migration-only (no Activity).
-- A person whose position has no active base profile (e.g. a soft-deleted
-- position, which 0102 did not backfill) stays NULL — no data loss.
update public.people p
  set position_seniority_profile_id = pr.id
from public.position_seniority_profiles pr
where p.position_id is not null
  and p.position_seniority_profile_id is null
  and pr.company_id = p.company_id
  and pr.position_id = p.position_id
  and pr.seniority_level_id is null
  and pr.active;

-- Evolve create_tenant_position_v1 (signature unchanged): position creation now
-- OWNS the position's active base profile, so the invariant "every live position
-- has exactly one active base profile" is guaranteed structurally going forward
-- (not only by the 0102 backfill). Body is copied verbatim from 0089 — auth,
-- validation, idempotency, Activity, return shape and error semantics unchanged —
-- with a single addition: after the real position INSERT, create the base profile.
-- This runs only on the genuine insert path (the idempotent_retry branch returns
-- earlier), so a retry never creates a second profile; the base_active_unique
-- partial index is the backstop. The base profile is structural infrastructure:
-- it emits NO Activity (position.created already covers the human action; the
-- position_seniority_profile.created Activity stays reserved for a human adding a
-- specific seniority applicability). 0089 is NOT edited.
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
  -- Structural base profile for the new position (seniority NULL, active). Same
  -- transaction, tenant-scoped, NO Activity. Only reached on the real insert path.
  insert into public.position_seniority_profiles (company_id, position_id, seniority_level_id, active)
  values (p_company_id, v_id, null, true);
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

-- Evolve create_tenant_person_v1 (signature unchanged) ------------------------
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
  v_profile_id uuid;
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

  -- Derive the position's active BASE profile (seniority NULL). position_id is
  -- the compatibility input; position_seniority_profile_id is kept coherent.
  if p_position_id is not null then
    select pr.id into v_profile_id from public.position_seniority_profiles pr
    where pr.company_id = p_company_id and pr.position_id = p_position_id
      and pr.seniority_level_id is null and pr.active;
    if v_profile_id is null then
      raise exception using errcode = 'P0002', message = 'POSITION_SENIORITY_PROFILE_NOT_FOUND';
    end if;
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
    team_id, position_id, position_seniority_profile_id, manager_id,
    disc_profile, updated_at
  ) values (
    p_company_id, v_name, v_email, v_phone, p_birth_date, p_hire_date, p_status,
    p_team_id, p_position_id, v_profile_id, p_manager_id, p_disc_profile, now()
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

-- Evolve update_tenant_person_v1 (signature unchanged) -----------------------
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
  v_profile_id uuid;
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

  -- Derive the position's active BASE profile (seniority NULL) and keep the new
  -- lotação column coherent with position_id in the same mutation.
  if p_position_id is not null then
    select pr.id into v_profile_id from public.position_seniority_profiles pr
    where pr.company_id = p_company_id and pr.position_id = p_position_id
      and pr.seniority_level_id is null and pr.active;
    if v_profile_id is null then
      raise exception using errcode = 'P0002', message = 'POSITION_SENIORITY_PROFILE_NOT_FOUND';
    end if;
  end if;

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
    position_seniority_profile_id = v_profile_id,
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

notify pgrst, 'reload schema';
