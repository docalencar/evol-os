-- Career / Seniority + Position Taxonomy — Slice 3B-A': historical archived
-- profile round-trip (DB-first).
--
-- PD-021 (Approved) + ADR-0017 (Accepted). DB-first, DB-only.
--
-- 0104's update_tenant_person_v2 is full-overwrite and its resolver rejects any
-- inactive profile. That makes it impossible to edit an unrelated field of a
-- person who holds a HISTORICAL archived profile (assigned while active, later
-- archived via 0102's archive boundary): resubmitting the archived id fails with
-- POSITION_SENIORITY_PROFILE_ARCHIVED, and submitting NULL would silently convert
-- the historical seniority to base.
--
-- Option 1 (approved): update_tenant_person_v2 preserves an UNCHANGED current
-- assignment even if the profile/seniority has since been archived, while a
-- CHANGED assignment keeps the strict 0104 rules. This is CREATE OR REPLACE of
-- update_tenant_person_v2 ONLY:
--   * create_tenant_person_v2 is unchanged (create is always a NEW assignment);
--   * the shared resolver stays strict (new assignment must be active);
--   * the coherence trigger is unchanged (relationship, not active-state);
--   * the read v3 boundaries already resolve historical labels (LEFT JOIN, no
--     active filter) — no read change needed.
--
-- 0104 (and older migrations) are NOT edited. No table grants, no RLS change,
-- no new assignment authority, no historical tolerance leaked into create.

create or replace function public.update_tenant_person_v2(
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
  p_disc_profile text,
  p_position_seniority_profile_id uuid
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
  v_position_id uuid;
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

  -- Resolve the coherent (position, profile) pair.
  -- UNCHANGED assignment (the submitted profile is EXACTLY the person's current
  -- persisted profile) is historical preservation: it may keep an archived
  -- profile/seniority, provided the tenant and profile<->position relationship
  -- stay coherent. Any CHANGED assignment (different profile id, incl. base/NULL)
  -- goes through the strict resolver and must satisfy the 0104 active rules.
  if p_position_seniority_profile_id is not null
    and p_position_seniority_profile_id is not distinct from v_person.position_seniority_profile_id
  then
    select pr.position_id into v_position_id
    from public.position_seniority_profiles pr
    where pr.id = p_position_seniority_profile_id and pr.company_id = p_company_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'POSITION_SENIORITY_PROFILE_NOT_FOUND';
    end if;
    -- The preserved profile cannot follow the person to a different Position.
    if p_position_id is not null and p_position_id <> v_position_id then
      raise exception using errcode = '23514', message = 'POSITION_SENIORITY_PROFILE_POSITION_MISMATCH';
    end if;
    v_profile_id := p_position_seniority_profile_id;
  else
    select o_position_id, o_profile_id into v_position_id, v_profile_id
    from public.resolve_tenant_person_position_assignment(
      p_company_id, p_position_id, p_position_seniority_profile_id
    );
  end if;

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
    team_id = p_team_id, position_id = v_position_id,
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
      'positionId', v_position_id, 'previousPositionId', v_person.position_id,
      'positionSeniorityProfileId', v_profile_id,
      'previousPositionSeniorityProfileId', v_person.position_seniority_profile_id,
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
