-- Career / Seniority — Slice 4B-0: trusted Position × Seniority competency-matrix
-- boundaries over public.position_seniority_competencies (created 0120, closed 0121).
--
-- The table is CLOSED / RPC-only: RLS is enabled and 0121 revoked every client
-- table privilege. These additive SECURITY DEFINER boundaries are the ONLY
-- authorized access path for the application:
--   * one member-scoped READ that returns the EFFECTIVE matrix (override ?? Base),
--   * two owner/admin/hr SEMANTIC mutations (set / clear).
-- This migration adds FUNCTIONS + EXECUTE grants only. It does NOT touch any table
-- privilege (the table stays closed), does NOT alter data, and introduces NO
-- dual-write: writes target only position_seniority_competencies; the legacy
-- position_competencies table is untouched.
--
-- Domain contract (approved 4B-0A):
--   * BASE profile (seniority NULL) holds the Position default expectation.
--   * Effective(specific profile, competency) = active override ?? active Base;
--     if neither exists -> NO EXPECTATION / NOT DEFINED (never fabricate a value).
--   * Overrides are WHOLE-ROW (expected_level/weight/required/type/notes as a unit).
--   * Clear = soft archive of the active row on the TARGET profile only; clearing
--     Base must not cascade into specific overrides.
--   * "exactly one ACTIVE row per (profile, competency)" is enforced by the 0120
--     partial unique index (WHERE archived_at IS NULL); archived generations coexist.

-- ---------------------------------------------------------------------------
-- READ — effective matrix (company member only, consistent with 0120 read policy).
-- ---------------------------------------------------------------------------
create or replace function public.get_tenant_position_seniority_competency_matrix_v1(
  p_company_id uuid,
  p_position_id uuid,
  p_include_archived_profiles boolean default false
)
returns table(
  position_seniority_profile_id uuid,
  seniority_level_id uuid,
  is_base_profile boolean,
  profile_active boolean,
  competency_id uuid,
  expected_level integer,
  weight integer,
  required boolean,
  type text,
  notes text,
  source text,            -- 'base' | 'override' | 'none'
  inherited boolean,      -- true only when a specific profile falls back to Base
  base_row_id uuid,       -- active Base row for the competency, when it exists
  override_row_id uuid    -- active override row on a specific profile, when present
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if not public.is_company_member(p_company_id) then
    raise exception using errcode = '42501', message = 'TENANT_AUTHORIZATION_DENIED';
  end if;

  return query
  with scoped as (
    -- Base (always active) + specific profiles; archived specifics only on request.
    select pr.id,
           pr.seniority_level_id,
           (pr.seniority_level_id is null) as is_base,
           pr.active
    from public.position_seniority_profiles pr
    where pr.company_id = p_company_id
      and pr.position_id = p_position_id
      and (pr.active or (p_include_archived_profiles and not pr.active))
  ),
  active_rows as (
    -- Active matrix rows on the scoped profiles (archived history excluded).
    select c.id as row_id,
           c.position_seniority_profile_id as profile_id,
           c.competency_id,
           c.expected_level, c.weight, c.required, c.type, c.notes
    from public.position_seniority_competencies c
    join scoped s on s.id = c.position_seniority_profile_id
    where c.company_id = p_company_id
      and c.archived_at is null
  ),
  base_rows as (
    -- Active Base rows, keyed by competency.
    select ar.row_id, ar.competency_id,
           ar.expected_level, ar.weight, ar.required, ar.type, ar.notes
    from active_rows ar
    join scoped s on s.id = ar.profile_id
    where s.is_base
  ),
  rowset as (
    -- Competencies with an active row in Base OR any ACTIVE specific profile.
    select distinct ar.competency_id
    from active_rows ar
    join scoped s on s.id = ar.profile_id
    where s.is_base or s.active
  ),
  grid as (
    select s.id as profile_id, s.seniority_level_id, s.is_base, s.active as profile_active,
           r.competency_id
    from scoped s
    cross join rowset r
  )
  select
    g.profile_id,
    g.seniority_level_id,
    g.is_base,
    g.profile_active,
    g.competency_id,
    case
      when g.is_base then own.expected_level
      when own.row_id is not null then own.expected_level
      else b.expected_level
    end,
    case
      when g.is_base then own.weight
      when own.row_id is not null then own.weight
      else b.weight
    end,
    case
      when g.is_base then own.required
      when own.row_id is not null then own.required
      else b.required
    end,
    case
      when g.is_base then own.type
      when own.row_id is not null then own.type
      else b.type
    end,
    case
      when g.is_base then own.notes
      when own.row_id is not null then own.notes
      else b.notes
    end,
    case
      when g.is_base then (case when own.row_id is not null then 'base' else 'none' end)
      when own.row_id is not null then 'override'
      when b.row_id is not null then 'base'
      else 'none'
    end,
    (not g.is_base) and own.row_id is null and b.row_id is not null,
    b.row_id,
    case when not g.is_base then own.row_id else null end
  from grid g
  left join active_rows own
    on own.profile_id = g.profile_id and own.competency_id = g.competency_id
  left join base_rows b
    on b.competency_id = g.competency_id
  order by (g.seniority_level_id is not null), g.seniority_level_id, g.competency_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- MUTATION — set (create/update Base expectation OR specific override), whole-row.
-- ---------------------------------------------------------------------------
create or replace function public.set_tenant_position_seniority_competency_v1(
  p_company_id uuid,
  p_position_seniority_profile_id uuid,
  p_competency_id uuid,
  p_expected_level integer,
  p_weight integer,
  p_required boolean,
  p_type text,
  p_notes text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_notes text := nullif(btrim(p_notes), '');
  v_profile public.position_seniority_profiles%rowtype;
  v_position_id uuid;
  v_is_base boolean;
  v_existing_id uuid;
  v_id uuid;
  v_mode text;
begin
  perform public.require_people_organization_mutator(p_company_id);

  if p_expected_level is null or p_expected_level not between 1 and 5
    or p_weight is null or p_weight not between 1 and 5
    or p_required is null
    or p_type is null or p_type not in ('core','leadership','promotion','optional')
    or (v_notes is not null and char_length(v_notes) > 500)
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  -- Tenant-safe profile resolution (composite identity). Archived profiles reject.
  select * into v_profile from public.position_seniority_profiles
  where id = p_position_seniority_profile_id and company_id = p_company_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'PROFILE_NOT_FOUND';
  end if;
  if not v_profile.active then
    raise exception using errcode = '22023', message = 'PROFILE_ARCHIVED';
  end if;
  v_position_id := v_profile.position_id;
  v_is_base := (v_profile.seniority_level_id is null);

  -- Competency must be an ACTIVE competency of the same tenant.
  if not exists (
    select 1 from public.competencies
    where id = p_competency_id and company_id = p_company_id and active = true
  ) then
    raise exception using errcode = 'P0002', message = 'COMPETENCY_NOT_FOUND';
  end if;

  -- Lock the active row (if any) for this (profile, competency); archived rows are
  -- historical and never updated. Branch create/update explicitly; the 0120 active
  -- partial unique index is the concurrency backstop -> 23505 CONFLICT on a race.
  select id into v_existing_id from public.position_seniority_competencies
  where company_id = p_company_id
    and position_seniority_profile_id = p_position_seniority_profile_id
    and competency_id = p_competency_id
    and archived_at is null
  for update;

  if v_existing_id is not null then
    update public.position_seniority_competencies set
      expected_level = p_expected_level,
      weight = p_weight,
      required = p_required,
      type = p_type,
      notes = v_notes,
      updated_at = now()
    where id = v_existing_id and company_id = p_company_id;
    v_id := v_existing_id;
    v_mode := 'updated';
  else
    begin
      insert into public.position_seniority_competencies (
        company_id, position_seniority_profile_id, competency_id,
        expected_level, weight, required, type, notes
      ) values (
        p_company_id, p_position_seniority_profile_id, p_competency_id,
        p_expected_level, p_weight, p_required, p_type, v_notes
      ) returning id into v_id;
    exception when unique_violation then
      raise exception using errcode = '23505', message = 'CONFLICT';
    end;
    v_mode := 'created';
  end if;

  perform public.append_people_organization_activity(
    p_company_id,
    'position_seniority_competency.' || v_mode,
    'competencies',
    case when v_mode = 'created'
      then 'Expectativa de competência definida'
      else 'Expectativa de competência atualizada' end,
    case when v_is_base
      then 'Uma expectativa de competência do perfil base foi definida.'
      else 'Uma expectativa de competência específica de senioridade foi definida.' end,
    'position_seniority_competency', v_id, 'position', v_position_id,
    jsonb_build_object(
      'positionSeniorityCompetencyId', v_id,
      'positionSeniorityProfileId', p_position_seniority_profile_id,
      'competencyId', p_competency_id,
      'isBaseProfile', v_is_base,
      'expectedLevel', p_expected_level,
      'weight', p_weight,
      'required', p_required,
      'type', p_type
    )
  );

  return jsonb_build_object(
    'status', 'succeeded', 'mode', v_mode,
    'positionSeniorityCompetencyId', v_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- MUTATION — clear (specific -> restore Base inheritance; Base -> remove default).
-- Soft archive of the active row on the TARGET profile only. Never cascades.
-- ---------------------------------------------------------------------------
create or replace function public.clear_tenant_position_seniority_competency_v1(
  p_company_id uuid,
  p_position_seniority_profile_id uuid,
  p_competency_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_profile public.position_seniority_profiles%rowtype;
  v_is_base boolean;
  v_row public.position_seniority_competencies%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_profile from public.position_seniority_profiles
  where id = p_position_seniority_profile_id and company_id = p_company_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'PROFILE_NOT_FOUND';
  end if;
  if not v_profile.active then
    raise exception using errcode = '22023', message = 'PROFILE_ARCHIVED';
  end if;
  v_is_base := (v_profile.seniority_level_id is null);

  -- Only the active row on THIS profile is affected. No read/write of other
  -- profiles' rows -> clearing Base cannot touch specific overrides.
  select * into v_row from public.position_seniority_competencies
  where company_id = p_company_id
    and position_seniority_profile_id = p_position_seniority_profile_id
    and competency_id = p_competency_id
    and archived_at is null
  for update;

  if not found then
    return jsonb_build_object(
      'status', 'already_cleared',
      'positionSeniorityProfileId', p_position_seniority_profile_id,
      'competencyId', p_competency_id
    );
  end if;

  update public.position_seniority_competencies
  set archived_at = now(), updated_at = now()
  where id = v_row.id and company_id = p_company_id;

  perform public.append_people_organization_activity(
    p_company_id, 'position_seniority_competency.cleared', 'competencies',
    'Expectativa de competência removida',
    case when v_is_base
      then 'A expectativa de competência do perfil base foi removida.'
      else 'A expectativa específica foi removida; o perfil volta a herdar do base.' end,
    'position_seniority_competency', v_row.id, 'position', v_profile.position_id,
    jsonb_build_object(
      'positionSeniorityCompetencyId', v_row.id,
      'positionSeniorityProfileId', p_position_seniority_profile_id,
      'competencyId', p_competency_id,
      'isBaseProfile', v_is_base
    )
  );

  return jsonb_build_object(
    'status', 'succeeded',
    'positionSeniorityCompetencyId', v_row.id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Explicit EXECUTE posture. Functions only; NO table privilege is touched here
-- (the three Career/Seniority tables remain closed per 0121). anon/service_role
-- denied; authenticated may execute (each function enforces its own authz).
-- ---------------------------------------------------------------------------
revoke all on function public.get_tenant_position_seniority_competency_matrix_v1(uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.set_tenant_position_seniority_competency_v1(
  uuid, uuid, uuid, integer, integer, boolean, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.clear_tenant_position_seniority_competency_v1(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.get_tenant_position_seniority_competency_matrix_v1(uuid, uuid, boolean),
  public.set_tenant_position_seniority_competency_v1(
    uuid, uuid, uuid, integer, integer, boolean, text, text
  ),
  public.clear_tenant_position_seniority_competency_v1(uuid, uuid, uuid)
to authenticated;

notify pgrst, 'reload schema';
