-- Career / Seniority + Position Taxonomy — Slice 3B-B': atomic Position +
-- applicable-seniority configuration (DB-first enabling contract).
--
-- PD-021 (Approved) + ADR-0017 (Accepted). DB-first, DB-only.
--
-- Lets "Novo cargo" / "Editar cargo" configure a Position AND its applicable
-- seniorities as ONE business intent, in a single transaction, with no partial
-- state. These are additive, versioned boundaries; 0089/0102/0103/0104/0105 are
-- NOT edited. To avoid duplicating domain logic, they COMPOSE the existing
-- trusted boundaries inside one plpgsql transaction:
--   * create: inline position insert + base profile + seniority-aware idempotency
--     (create_tenant_position_v1's fingerprint is position-only and cannot carry
--     the seniority intent), then add_tenant_position_seniority_profile_v1 per
--     selected seniority (reuses its validation + position_seniority_profile.created);
--   * update: update_tenant_position_v1 (position fields + position.updated), then
--     add/archive_tenant_position_seniority_profile_v1 for the desired-vs-current
--     diff (reuses their validation + Activity). A plpgsql function is one
--     transaction, so any inner failure rolls the whole intent back.
--
-- Base profile: structural infrastructure — never an accepted seniority input,
-- never archived here, never emits business seniority Activity. Reactivation of a
-- previously-archived (position, seniority) follows the canonical Slice 2B
-- behaviour (a new active row; the archived row remains as history). No table
-- grants, no RLS change, no service_role.

-- ---------------------------------------------------------------------------
-- create_tenant_position_with_seniorities_v1
-- ---------------------------------------------------------------------------
create or replace function public.create_tenant_position_with_seniorities_v1(
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
  p_idempotency_key text,
  p_seniority_level_ids uuid[]
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
  v_ids uuid[] := coalesce(p_seniority_level_ids, '{}');
  v_fingerprint text;
  v_existing public.activity_events%rowtype;
  v_sid uuid;
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

  -- Validate the selected seniority set BEFORE any write: no NULLs, no
  -- duplicates, and each must be an ACTIVE seniority of this tenant (the base
  -- profile is never selectable — NULL is rejected here).
  if exists (select 1 from unnest(v_ids) s where s is null) then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;
  if array_length(v_ids, 1) is not null
    and array_length(v_ids, 1) <> (select count(distinct s)::int from unnest(v_ids) s)
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;
  if exists (
    select 1 from unnest(v_ids) sid
    where not exists (
      select 1 from public.seniority_levels s
      where s.id = sid and s.company_id = p_company_id and s.active
    )
  ) then
    raise exception using errcode = 'P0002', message = 'SENIORITY_LEVEL_NOT_FOUND';
  end if;

  -- Seniority-aware fingerprint: the selected set participates so a changed
  -- selection under the same key is a conflict, not a silent retry.
  v_fingerprint := encode(extensions.digest(jsonb_build_object(
    'name', v_name, 'description', v_description, 'departmentId', p_department_id,
    'hierarchicalLevel', p_hierarchical_level, 'status', p_status,
    'weeklyWorkloadHours', p_weekly_workload_hours, 'workModel', p_work_model,
    'employmentType', p_employment_type, 'travelRequirement', p_travel_requirement,
    'seniorityLevelIds', coalesce((select jsonb_agg(s order by s) from unnest(v_ids) s), '[]'::jsonb)
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

  -- Structural base profile (seniority NULL, active). Same transaction, no Activity.
  insert into public.position_seniority_profiles (company_id, position_id, seniority_level_id, active)
  values (p_company_id, v_id, null, true);

  perform public.append_people_organization_activity(
    p_company_id, 'position.created', 'organization', 'Cargo criado',
    'O cargo ' || v_name || ' foi criado.', 'position', v_id, null, null,
    jsonb_build_object(
      'positionId', v_id, 'positionName', v_name, 'departmentId', p_department_id,
      'hierarchicalLevel', p_hierarchical_level, 'status', p_status,
      'seniorityLevelIds', coalesce((select jsonb_agg(s order by s) from unnest(v_ids) s), '[]'::jsonb),
      'intentFingerprint', v_fingerprint
    ), v_key
  );

  -- Apply each selected seniority through the trusted 0102 boundary (reuses its
  -- validation and emits position_seniority_profile.created). Same transaction.
  foreach v_sid in array v_ids loop
    perform public.add_tenant_position_seniority_profile_v1(p_company_id, v_id, v_sid);
  end loop;

  return jsonb_build_object('status', 'succeeded', 'positionId', v_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- update_tenant_position_with_seniorities_v1
-- ---------------------------------------------------------------------------
create or replace function public.update_tenant_position_with_seniorities_v1(
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
  p_travel_requirement text,
  p_seniority_level_ids uuid[]
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_ids uuid[] := coalesce(p_seniority_level_ids, '{}');
  v_sid uuid;
  v_profile record;
begin
  perform public.require_people_organization_mutator(p_company_id);

  -- Validate the desired seniority set BEFORE any write (atomic rollback of the
  -- Position field update if a selection is invalid).
  if exists (select 1 from unnest(v_ids) s where s is null) then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;
  if array_length(v_ids, 1) is not null
    and array_length(v_ids, 1) <> (select count(distinct s)::int from unnest(v_ids) s)
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;
  if exists (
    select 1 from unnest(v_ids) sid
    where not exists (
      select 1 from public.seniority_levels s
      where s.id = sid and s.company_id = p_company_id and s.active
    )
  ) then
    raise exception using errcode = 'P0002', message = 'SENIORITY_LEVEL_NOT_FOUND';
  end if;

  -- Update the Position fields (+ position.updated Activity) via the trusted
  -- 0089 boundary — also validates the Position exists and the field inputs.
  perform public.update_tenant_position_v1(
    p_company_id, p_position_id, p_name, p_description, p_department_id,
    p_hierarchical_level, p_status, p_weekly_workload_hours, p_work_model,
    p_employment_type, p_travel_requirement
  );

  -- Archive currently-active specific profiles no longer desired.
  for v_profile in
    select id from public.position_seniority_profiles
    where company_id = p_company_id and position_id = p_position_id
      and seniority_level_id is not null and active
      and seniority_level_id <> all (v_ids)
  loop
    perform public.archive_tenant_position_seniority_profile_v1(p_company_id, v_profile.id);
  end loop;

  -- Add newly-desired seniorities not currently active (reactivation follows the
  -- canonical 0102 behaviour: a new active row).
  foreach v_sid in array v_ids loop
    if not exists (
      select 1 from public.position_seniority_profiles
      where company_id = p_company_id and position_id = p_position_id
        and seniority_level_id = v_sid and active
    ) then
      perform public.add_tenant_position_seniority_profile_v1(p_company_id, p_position_id, v_sid);
    end if;
  end loop;

  return jsonb_build_object('status', 'succeeded', 'positionId', p_position_id);
end;
$$;

revoke all on function public.create_tenant_position_with_seniorities_v1(
  uuid, text, text, uuid, text, text, integer, text, text, text, text, uuid[]
) from public, anon, service_role;
revoke all on function public.update_tenant_position_with_seniorities_v1(
  uuid, uuid, text, text, uuid, text, text, integer, text, text, text, uuid[]
) from public, anon, service_role;
grant execute on function public.create_tenant_position_with_seniorities_v1(
  uuid, text, text, uuid, text, text, integer, text, text, text, text, uuid[]
) to authenticated;
grant execute on function public.update_tenant_position_with_seniorities_v1(
  uuid, uuid, text, text, uuid, text, text, integer, text, text, text, uuid[]
) to authenticated;

notify pgrst, 'reload schema';
