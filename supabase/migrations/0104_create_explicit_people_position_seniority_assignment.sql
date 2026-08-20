-- Career / Seniority + Position Taxonomy — Slice 3B-A: explicit People
-- position-seniority assignment (DB-first).
--
-- PD-021 (Approved) + ADR-0017 (Accepted). DB-first, DB-only.
--
-- 0103 made create/update_tenant_person_v1 derive a Position's active BASE
-- profile from position_id. This slice lets an authorized user assign a Person to
-- a specific applicable seniority profile of that Position. It is ADDITIVE:
--   * v1 mutation/read boundaries are NOT changed (compatibility / rollback);
--   * v2 person mutation boundaries add an optional explicit profile;
--   * v3 read boundaries expose the assigned seniority for display;
--   * a hardened coherence trigger is defense-in-depth so an incoherent
--     position <-> profile pair can never be persisted (composite FK proves the
--     tenant; it cannot prove the cross-table Position relationship).
--
-- No department_id (department stays derived). No Team∈Department invariant. No
-- table grants. No app change. 0089/0090/0102/0103 are not edited.
--
-- Error taxonomy (aligned with existing conventions):
--   P0002  POSITION_SENIORITY_PROFILE_NOT_FOUND  (nonexistent/cross-tenant/missing base)
--   22023  POSITION_SENIORITY_PROFILE_ARCHIVED   (explicit profile is inactive)
--   22023  SENIORITY_LEVEL_ARCHIVED              (specific profile's seniority is inactive)
--   23514  POSITION_SENIORITY_PROFILE_POSITION_MISMATCH (explicit position disagrees with profile)
--   23514  TENANT_REFERENCE_INVALID              (profile's position is not a live tenant position)
--   23514  POSITION_SENIORITY_PROFILE_INCOHERENT (trigger: relationship not coherent)

-- ---------------------------------------------------------------------------
-- A. Coherence trigger (structural defense-in-depth, no Activity, no resolution).
-- Validates the RELATIONSHIP only (profile belongs to the row's position + tenant),
-- never active-state: an already-assigned, later-archived profile stays a valid
-- historical reference. The trusted boundaries remain the assignment authority.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_people_position_seniority_coherence()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prof_company uuid;
  v_prof_position uuid;
begin
  -- No position => no profile.
  if new.position_id is null and new.position_seniority_profile_id is not null then
    raise exception using errcode = '23514', message = 'POSITION_SENIORITY_PROFILE_INCOHERENT';
  end if;

  -- A referenced profile must belong to the same tenant AND the same position.
  if new.position_seniority_profile_id is not null then
    select pr.company_id, pr.position_id
      into v_prof_company, v_prof_position
    from public.position_seniority_profiles pr
    where pr.id = new.position_seniority_profile_id;

    if v_prof_company is null
      or v_prof_company <> new.company_id
      or new.position_id is null
      or v_prof_position <> new.position_id
    then
      raise exception using errcode = '23514', message = 'POSITION_SENIORITY_PROFILE_INCOHERENT';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_people_position_seniority_coherence()
from public, anon, authenticated, service_role;

drop trigger if exists people_position_seniority_coherence_trigger on public.people;
create trigger people_position_seniority_coherence_trigger
  before insert or update on public.people
  for each row execute function public.enforce_people_position_seniority_coherence();

-- ---------------------------------------------------------------------------
-- Internal resolver (single source of truth for base/explicit resolution).
-- Not a second write authority: it validates and resolves (position, profile);
-- it never writes. Called only by the SECURITY DEFINER v2 boundaries.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_tenant_person_position_assignment(
  p_company_id uuid,
  p_position_id uuid,
  p_position_seniority_profile_id uuid,
  out o_position_id uuid,
  out o_profile_id uuid
)
returns record
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prof_position uuid;
  v_prof_seniority uuid;
  v_prof_active boolean;
begin
  if p_position_seniority_profile_id is not null then
    -- Explicit profile is authoritative for the Position.
    select pr.position_id, pr.seniority_level_id, pr.active
      into v_prof_position, v_prof_seniority, v_prof_active
    from public.position_seniority_profiles pr
    where pr.id = p_position_seniority_profile_id and pr.company_id = p_company_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'POSITION_SENIORITY_PROFILE_NOT_FOUND';
    end if;
    -- New assignment must target an ACTIVE profile (history is not reassigned).
    if not v_prof_active then
      raise exception using errcode = '22023', message = 'POSITION_SENIORITY_PROFILE_ARCHIVED';
    end if;
    -- The profile's Position must be a live tenant Position.
    if not exists (
      select 1 from public.positions p
      where p.id = v_prof_position and p.company_id = p_company_id and p.deleted_at is null
    ) then
      raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID';
    end if;
    -- A specific profile's seniority must be active for a NEW assignment.
    if v_prof_seniority is not null and not exists (
      select 1 from public.seniority_levels s
      where s.id = v_prof_seniority and s.company_id = p_company_id and s.active
    ) then
      raise exception using errcode = '22023', message = 'SENIORITY_LEVEL_ARCHIVED';
    end if;
    -- An explicitly supplied Position must agree with the profile (hard error).
    if p_position_id is not null and p_position_id <> v_prof_position then
      raise exception using errcode = '23514', message = 'POSITION_SENIORITY_PROFILE_POSITION_MISMATCH';
    end if;
    o_position_id := v_prof_position;
    o_profile_id := p_position_seniority_profile_id;
  elsif p_position_id is not null then
    -- No explicit profile: derive the Position's active BASE profile (0103 rule).
    if not exists (
      select 1 from public.positions p
      where p.id = p_position_id and p.company_id = p_company_id and p.deleted_at is null
    ) then
      raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID';
    end if;
    select pr.id into o_profile_id from public.position_seniority_profiles pr
    where pr.company_id = p_company_id and pr.position_id = p_position_id
      and pr.seniority_level_id is null and pr.active;
    if o_profile_id is null then
      raise exception using errcode = 'P0002', message = 'POSITION_SENIORITY_PROFILE_NOT_FOUND';
    end if;
    o_position_id := p_position_id;
  else
    o_position_id := null;
    o_profile_id := null;
  end if;
end;
$$;

revoke all on function public.resolve_tenant_person_position_assignment(uuid, uuid, uuid)
from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- B. create_tenant_person_v2 (v1 + optional explicit profile). v1 unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.create_tenant_person_v2(
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
  p_idempotency_key text,
  p_position_seniority_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_person_id uuid;
  v_position_id uuid;
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

  -- Resolve the coherent (position, profile) pair (base or explicit).
  select o_position_id, o_profile_id into v_position_id, v_profile_id
  from public.resolve_tenant_person_position_assignment(
    p_company_id, p_position_id, p_position_seniority_profile_id
  );

  if p_manager_id is not null and not exists (
    select 1 from public.people
    where id = p_manager_id and company_id = p_company_id and status <> 'terminated'
  ) then
    raise exception using errcode = '23514', message = 'TENANT_REFERENCE_INVALID';
  end if;

  -- Fingerprint includes the resolved profile so a changed seniority intent under
  -- the same key is NOT absorbed as an idempotent retry.
  v_fingerprint := encode(extensions.digest(jsonb_build_object(
    'fullName', v_name, 'email', v_email, 'phone', v_phone,
    'birthDate', p_birth_date, 'hireDate', p_hire_date, 'status', p_status,
    'teamId', p_team_id, 'positionId', v_position_id,
    'positionSeniorityProfileId', v_profile_id,
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
    p_team_id, v_position_id, v_profile_id, p_manager_id, p_disc_profile, now()
  ) returning id into v_person_id;

  perform public.append_people_organization_activity(
    p_company_id, 'employee.created', 'people', 'Colaborador criado',
    'O colaborador ' || v_name || ' foi criado.', 'employee', v_person_id,
    'employee', v_person_id,
    jsonb_build_object(
      'employeeId', v_person_id, 'employeeName', v_name, 'status', p_status,
      'teamId', p_team_id, 'positionId', v_position_id,
      'positionSeniorityProfileId', v_profile_id,
      'managerId', p_manager_id, 'hireDate', p_hire_date,
      'intentFingerprint', v_fingerprint
    ), v_key
  );

  return jsonb_build_object('status', 'succeeded', 'personId', v_person_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- C. update_tenant_person_v2 (v1 + optional explicit profile). v1 unchanged.
-- ---------------------------------------------------------------------------
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

  -- Resolve the coherent (position, profile) pair (base or explicit).
  select o_position_id, o_profile_id into v_position_id, v_profile_id
  from public.resolve_tenant_person_position_assignment(
    p_company_id, p_position_id, p_position_seniority_profile_id
  );

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

revoke all on function public.create_tenant_person_v2(
  uuid, text, text, text, date, date, text, uuid, uuid, uuid, text, text, uuid
) from public, anon, service_role;
revoke all on function public.update_tenant_person_v2(
  uuid, uuid, text, text, text, date, date, text, uuid, uuid, uuid, text, uuid
) from public, anon, service_role;
grant execute on function public.create_tenant_person_v2(
  uuid, text, text, text, date, date, text, uuid, uuid, uuid, text, text, uuid
) to authenticated;
grant execute on function public.update_tenant_person_v2(
  uuid, uuid, text, text, text, date, date, text, uuid, uuid, uuid, text, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- D/E. Read boundaries v3: v2 fields + assigned seniority (historical-safe).
-- LEFT JOINs deliberately omit an active filter on the profile/seniority so an
-- archived historical assignment still resolves its label. The base profile
-- (seniority_level_id NULL) surfaces NULL seniority fields (no invented seniority).
-- ---------------------------------------------------------------------------
create or replace function public.get_tenant_people_management_v3(p_company_id uuid)
returns table(person_id uuid,full_name text,email text,phone text,birth_date date,hire_date date,
  status text,has_user_access boolean,manager_id uuid,manager_name text,team_id uuid,team_name text,
  position_id uuid,position_name text,position_seniority_profile_id uuid,seniority_level_id uuid,
  seniority_code text,seniority_label text,disc_profile text,avatar_url text,
  created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select p.id,p.full_name,p.email,p.phone,p.birth_date,p.hire_date,p.status,
    p.user_id is not null,m.id,m.full_name,t.id,t.name,pos.id,pos.name,
    p.position_seniority_profile_id,pr.seniority_level_id,s.code,s.label,
    p.disc_profile,p.avatar_url,p.created_at,p.updated_at
  from public.people p
  left join public.people m on m.id=p.manager_id and m.company_id=p.company_id
  left join public.teams t on t.id=p.team_id and t.company_id=p.company_id and t.deleted_at is null
  left join public.positions pos on pos.id=p.position_id and pos.company_id=p.company_id and pos.deleted_at is null
  left join public.position_seniority_profiles pr on pr.id=p.position_seniority_profile_id and pr.company_id=p.company_id
  left join public.seniority_levels s on s.id=pr.seniority_level_id and s.company_id=p.company_id
  where p.company_id=p_company_id
  order by p.full_name,p.id;
end; $$;

create or replace function public.get_tenant_person_profile_v3(p_company_id uuid,p_person_id uuid)
returns table(person_id uuid,full_name text,email text,phone text,birth_date date,hire_date date,
  status text,has_user_access boolean,manager_id uuid,manager_name text,team_id uuid,team_name text,
  position_id uuid,position_name text,position_seniority_profile_id uuid,seniority_level_id uuid,
  seniority_code text,seniority_label text,disc_profile text,avatar_url text,
  created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select * from public.get_tenant_people_management_v3(p_company_id) p where p.person_id=p_person_id;
end; $$;

revoke all on function public.get_tenant_people_management_v3(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_person_profile_v3(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_tenant_people_management_v3(uuid),public.get_tenant_person_profile_v3(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
