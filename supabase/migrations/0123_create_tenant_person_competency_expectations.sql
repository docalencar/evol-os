-- Career / Seniority — Slice 5A: canonical person competency expectation read.
--
-- Facts only: persisted assignment -> effective active expectations -> optional
-- active employee evidence. No gap, coverage, risk, readiness or scoring.

create or replace function public.get_tenant_person_competency_expectations_v1(
  p_company_id uuid,
  p_person_id uuid
)
returns table(
  assignment_state text,
  person_id uuid,
  position_id uuid,
  position_seniority_profile_id uuid,
  seniority_level_id uuid,
  competency_id uuid,
  competency_name text,
  expected_level integer,
  weight integer,
  required boolean,
  competency_type text,
  expectation_notes text,
  expectation_source text,
  inherited boolean,
  employee_competency_id uuid,
  current_level integer,
  evidence_source text,
  validated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_actor_person_id uuid;
  v_person public.people%rowtype;
  v_profile public.position_seniority_profiles%rowtype;
  v_position public.positions%rowtype;
  v_base_profile_id uuid;
  v_seniority_active boolean;
  v_row_count integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  select membership.role
    into v_role
  from public.company_members membership
  where membership.company_id = p_company_id
    and membership.user_id = auth.uid()
    and membership.status = 'active';

  v_actor_person_id := public.current_person_id(p_company_id);

  if v_role is null
    or (v_role not in ('owner', 'admin', 'hr')
      and v_actor_person_id is distinct from p_person_id)
  then
    raise exception using errcode = '42501',
      message = 'PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN';
  end if;

  select target.*
    into v_person
  from public.people target
  where target.id = p_person_id
    and target.company_id = p_company_id;

  -- One safe denial for missing and cross-tenant targets: no existence oracle.
  if not found then
    raise exception using errcode = '42501',
      message = 'PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN';
  end if;

  if v_person.position_id is null then
    assignment_state := 'no_position';
    person_id := v_person.id;
    position_id := null;
    position_seniority_profile_id := null;
    seniority_level_id := null;
    return next;
    return;
  end if;

  if v_person.position_seniority_profile_id is null then
    assignment_state := 'missing_profile';
    person_id := v_person.id;
    position_id := v_person.position_id;
    position_seniority_profile_id := null;
    seniority_level_id := null;
    return next;
    return;
  end if;

  select profile.*
    into v_profile
  from public.position_seniority_profiles profile
  where profile.id = v_person.position_seniority_profile_id;

  if not found
    or v_profile.company_id <> p_company_id
    or v_profile.position_id <> v_person.position_id
  then
    raise exception using errcode = '23514',
      message = 'PERSON_COMPETENCY_ASSIGNMENT_INVALID';
  end if;

  select assigned_position.*
    into v_position
  from public.positions assigned_position
  where assigned_position.id = v_person.position_id
    and assigned_position.company_id = p_company_id;

  if not found then
    raise exception using errcode = '23514',
      message = 'PERSON_COMPETENCY_ASSIGNMENT_INVALID';
  end if;

  v_seniority_active := true;
  if v_profile.seniority_level_id is not null then
    select seniority.active
      into v_seniority_active
    from public.seniority_levels seniority
    where seniority.id = v_profile.seniority_level_id
      and seniority.company_id = p_company_id;

    if not found then
      raise exception using errcode = '23514',
        message = 'PERSON_COMPETENCY_ASSIGNMENT_INVALID';
    end if;
  end if;

  if not v_profile.active
    or not v_seniority_active
    or v_position.deleted_at is not null
    or v_position.status <> 'active'
  then
    assignment_state := 'stale_assignment';
    person_id := v_person.id;
    position_id := v_person.position_id;
    position_seniority_profile_id := v_profile.id;
    seniority_level_id := v_profile.seniority_level_id;
    return next;
    return;
  end if;

  if v_profile.seniority_level_id is null then
    v_base_profile_id := v_profile.id;
  else
    select base_profile.id
      into v_base_profile_id
    from public.position_seniority_profiles base_profile
    where base_profile.company_id = p_company_id
      and base_profile.position_id = v_person.position_id
      and base_profile.seniority_level_id is null
      and base_profile.active;

    if not found then
      raise exception using errcode = '23514',
        message = 'PERSON_COMPETENCY_ASSIGNMENT_INVALID';
    end if;
  end if;

  return query
  with active_rows as (
    select expectation.*
    from public.position_seniority_competencies expectation
    where expectation.company_id = p_company_id
      and expectation.archived_at is null
      and expectation.position_seniority_profile_id in (
        v_profile.id,
        v_base_profile_id
      )
  ), competency_keys as (
    select distinct expectation_row.competency_id
    from active_rows expectation_row
  ), effective as (
    select
      key.competency_id,
      case
        when v_profile.seniority_level_id is null then base_row.id
        when specific_row.id is not null then specific_row.id
        else base_row.id
      end as expectation_id,
      case
        when v_profile.seniority_level_id is null then base_row.expected_level
        when specific_row.id is not null then specific_row.expected_level
        else base_row.expected_level
      end as expected_level,
      case
        when v_profile.seniority_level_id is null then base_row.weight
        when specific_row.id is not null then specific_row.weight
        else base_row.weight
      end as weight,
      case
        when v_profile.seniority_level_id is null then base_row.required
        when specific_row.id is not null then specific_row.required
        else base_row.required
      end as required,
      case
        when v_profile.seniority_level_id is null then base_row.type
        when specific_row.id is not null then specific_row.type
        else base_row.type
      end as competency_type,
      case
        when v_profile.seniority_level_id is null then base_row.notes
        when specific_row.id is not null then specific_row.notes
        else base_row.notes
      end as expectation_notes,
      case
        when v_profile.seniority_level_id is null then 'base'::text
        when specific_row.id is not null then 'override'::text
        else 'base'::text
      end as expectation_source,
      v_profile.seniority_level_id is not null
        and specific_row.id is null
        and base_row.id is not null as inherited
    from competency_keys key
    left join active_rows specific_row
      on specific_row.position_seniority_profile_id = v_profile.id
     and specific_row.competency_id = key.competency_id
    left join active_rows base_row
      on base_row.position_seniority_profile_id = v_base_profile_id
     and base_row.competency_id = key.competency_id
  )
  select
    'active_assignment_with_expectations'::text,
    v_person.id,
    v_person.position_id,
    v_profile.id,
    v_profile.seniority_level_id,
    effective.competency_id,
    competency.name,
    effective.expected_level,
    effective.weight,
    effective.required,
    effective.competency_type,
    effective.expectation_notes,
    effective.expectation_source,
    effective.inherited,
    evidence.id,
    evidence.current_level,
    evidence.source,
    evidence.validated_at
  from effective
  join public.competencies competency
    on competency.id = effective.competency_id
   and competency.company_id = p_company_id
   and competency.active
  left join public.employee_competencies evidence
    on evidence.company_id = p_company_id
   and evidence.employee_id = v_person.id
   and evidence.competency_id = effective.competency_id
   and evidence.archived_at is null
  where effective.expectation_id is not null
  order by competency.name, effective.competency_id;

  get diagnostics v_row_count = row_count;

  if v_row_count = 0 then
    assignment_state := 'active_assignment_with_no_expectations';
    person_id := v_person.id;
    position_id := v_person.position_id;
    position_seniority_profile_id := v_profile.id;
    seniority_level_id := v_profile.seniority_level_id;
    competency_id := null;
    competency_name := null;
    expected_level := null;
    weight := null;
    required := null;
    competency_type := null;
    expectation_notes := null;
    expectation_source := null;
    inherited := null;
    employee_competency_id := null;
    current_level := null;
    evidence_source := null;
    validated_at := null;
    return next;
  end if;
end;
$$;

revoke all on function public.get_tenant_person_competency_expectations_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_tenant_person_competency_expectations_v1(uuid, uuid)
  to authenticated;

notify pgrst, 'reload schema';
