-- Career / Seniority — Slice 5D-0: company-wide canonical person competency facts.
--
-- Set-based factual projection for the Dashboard population (active/on_leave).
-- It mirrors 0123 per person without calculating gaps, scores, risk or priority.

create or replace function public.get_tenant_company_person_competency_expectations_v1(
  p_company_id uuid
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

  if v_role is null or v_role not in ('owner', 'admin', 'hr') then
    raise exception using errcode = '42501',
      message = 'COMPANY_PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN';
  end if;

  -- Preserve 0123's fail-closed handling of structurally invalid assignments.
  if exists (
    select 1
    from public.people person
    left join public.position_seniority_profiles profile
      on profile.id = person.position_seniority_profile_id
    where person.company_id = p_company_id
      and person.status in ('active', 'on_leave')
      and person.position_id is not null
      and person.position_seniority_profile_id is not null
      and (
        profile.id is null
        or profile.company_id <> p_company_id
        or profile.position_id <> person.position_id
      )
  ) then
    raise exception using errcode = '23514',
      message = 'PERSON_COMPETENCY_ASSIGNMENT_INVALID';
  end if;

  if exists (
    select 1
    from public.people person
    left join public.positions position
      on position.id = person.position_id
     and position.company_id = p_company_id
    where person.company_id = p_company_id
      and person.status in ('active', 'on_leave')
      and person.position_id is not null
      and person.position_seniority_profile_id is not null
      and position.id is null
  ) then
    raise exception using errcode = '23514',
      message = 'PERSON_COMPETENCY_ASSIGNMENT_INVALID';
  end if;

  if exists (
    select 1
    from public.people person
    join public.position_seniority_profiles profile
      on profile.id = person.position_seniority_profile_id
    left join public.seniority_levels seniority
      on seniority.id = profile.seniority_level_id
     and seniority.company_id = p_company_id
    where person.company_id = p_company_id
      and person.status in ('active', 'on_leave')
      and person.position_id is not null
      and profile.company_id = p_company_id
      and profile.position_id = person.position_id
      and profile.seniority_level_id is not null
      and seniority.id is null
  ) then
    raise exception using errcode = '23514',
      message = 'PERSON_COMPETENCY_ASSIGNMENT_INVALID';
  end if;

  if exists (
    select 1
    from public.people person
    join public.position_seniority_profiles profile
      on profile.id = person.position_seniority_profile_id
     and profile.company_id = p_company_id
     and profile.position_id = person.position_id
    join public.positions position
      on position.id = person.position_id
     and position.company_id = p_company_id
    join public.seniority_levels seniority
      on seniority.id = profile.seniority_level_id
     and seniority.company_id = p_company_id
    where person.company_id = p_company_id
      and person.status in ('active', 'on_leave')
      and profile.active
      and seniority.active
      and position.deleted_at is null
      and position.status = 'active'
      and not exists (
        select 1
        from public.position_seniority_profiles base_profile
        where base_profile.company_id = p_company_id
          and base_profile.position_id = person.position_id
          and base_profile.seniority_level_id is null
          and base_profile.active
      )
  ) then
    raise exception using errcode = '23514',
      message = 'PERSON_COMPETENCY_ASSIGNMENT_INVALID';
  end if;

  return query
  with eligible_people as (
    select person.*
    from public.people person
    where person.company_id = p_company_id
      and person.status in ('active', 'on_leave')
  ), resolved_assignments as (
    select
      person.id as person_id,
      person.position_id,
      profile.id as profile_id,
      profile.seniority_level_id,
      case
        when person.position_id is null then 'no_position'
        when person.position_seniority_profile_id is null then 'missing_profile'
        when not profile.active
          or not coalesce(seniority.active, true)
          or position.deleted_at is not null
          or position.status <> 'active'
          then 'stale_assignment'
        else 'active'
      end as state,
      case
        when profile.seniority_level_id is null then profile.id
        else base_profile.id
      end as base_profile_id
    from eligible_people person
    left join public.position_seniority_profiles profile
      on profile.id = person.position_seniority_profile_id
    left join public.positions position
      on position.id = person.position_id
     and position.company_id = p_company_id
    left join public.seniority_levels seniority
      on seniority.id = profile.seniority_level_id
     and seniority.company_id = p_company_id
    left join public.position_seniority_profiles base_profile
      on base_profile.company_id = p_company_id
     and base_profile.position_id = person.position_id
     and base_profile.seniority_level_id is null
     and base_profile.active
  ), competency_keys as (
    select distinct
      assignment.person_id,
      expectation.competency_id
    from resolved_assignments assignment
    join public.position_seniority_competencies expectation
      on expectation.company_id = p_company_id
     and expectation.archived_at is null
     and expectation.position_seniority_profile_id in (
       assignment.profile_id,
       assignment.base_profile_id
     )
    where assignment.state = 'active'
  ), effective_expectations as (
    select
      assignment.person_id,
      assignment.position_id,
      assignment.profile_id,
      assignment.seniority_level_id,
      key.competency_id,
      case
        when assignment.seniority_level_id is null then base_expectation.id
        when specific_expectation.id is not null then specific_expectation.id
        else base_expectation.id
      end as expectation_id,
      case
        when assignment.seniority_level_id is null then base_expectation.expected_level
        when specific_expectation.id is not null then specific_expectation.expected_level
        else base_expectation.expected_level
      end as expected_level,
      case
        when assignment.seniority_level_id is null then base_expectation.weight
        when specific_expectation.id is not null then specific_expectation.weight
        else base_expectation.weight
      end as weight,
      case
        when assignment.seniority_level_id is null then base_expectation.required
        when specific_expectation.id is not null then specific_expectation.required
        else base_expectation.required
      end as required,
      case
        when assignment.seniority_level_id is null then base_expectation.type
        when specific_expectation.id is not null then specific_expectation.type
        else base_expectation.type
      end as competency_type,
      case
        when assignment.seniority_level_id is null then base_expectation.notes
        when specific_expectation.id is not null then specific_expectation.notes
        else base_expectation.notes
      end as expectation_notes,
      case
        when assignment.seniority_level_id is null then 'base'::text
        when specific_expectation.id is not null then 'override'::text
        else 'base'::text
      end as expectation_source,
      assignment.seniority_level_id is not null
        and specific_expectation.id is null
        and base_expectation.id is not null as inherited
    from resolved_assignments assignment
    join competency_keys key on key.person_id = assignment.person_id
    left join public.position_seniority_competencies specific_expectation
      on specific_expectation.company_id = p_company_id
     and specific_expectation.position_seniority_profile_id = assignment.profile_id
     and specific_expectation.competency_id = key.competency_id
     and specific_expectation.archived_at is null
    left join public.position_seniority_competencies base_expectation
      on base_expectation.company_id = p_company_id
     and base_expectation.position_seniority_profile_id = assignment.base_profile_id
     and base_expectation.competency_id = key.competency_id
     and base_expectation.archived_at is null
    where assignment.state = 'active'
  ), fact_rows as (
    select
      'active_assignment_with_expectations'::text as assignment_state,
      expectation.person_id,
      expectation.position_id,
      expectation.profile_id as position_seniority_profile_id,
      expectation.seniority_level_id,
      expectation.competency_id,
      competency.name as competency_name,
      expectation.expected_level,
      expectation.weight,
      expectation.required,
      expectation.competency_type,
      expectation.expectation_notes,
      expectation.expectation_source,
      expectation.inherited,
      evidence.id as employee_competency_id,
      evidence.current_level,
      evidence.source as evidence_source,
      evidence.validated_at
    from effective_expectations expectation
    join public.competencies competency
      on competency.id = expectation.competency_id
     and competency.company_id = p_company_id
     and competency.active
    left join public.employee_competencies evidence
      on evidence.company_id = p_company_id
     and evidence.employee_id = expectation.person_id
     and evidence.competency_id = expectation.competency_id
     and evidence.archived_at is null
    where expectation.expectation_id is not null
  ), sentinel_rows as (
    select
      case
        when assignment.state = 'active'
          then 'active_assignment_with_no_expectations'::text
        else assignment.state
      end as assignment_state,
      assignment.person_id,
      assignment.position_id,
      assignment.profile_id as position_seniority_profile_id,
      assignment.seniority_level_id,
      null::uuid as competency_id,
      null::text as competency_name,
      null::integer as expected_level,
      null::integer as weight,
      null::boolean as required,
      null::text as competency_type,
      null::text as expectation_notes,
      null::text as expectation_source,
      null::boolean as inherited,
      null::uuid as employee_competency_id,
      null::integer as current_level,
      null::text as evidence_source,
      null::timestamptz as validated_at
    from resolved_assignments assignment
    where assignment.state <> 'active'
       or not exists (
         select 1 from fact_rows fact where fact.person_id = assignment.person_id
       )
  )
  select result.*
  from (
    select * from fact_rows
    union all
    select * from sentinel_rows
  ) result
  order by result.person_id, result.competency_name nulls first, result.competency_id;
end;
$$;

revoke all on function public.get_tenant_company_person_competency_expectations_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_tenant_company_person_competency_expectations_v1(uuid)
  to authenticated;

notify pgrst, 'reload schema';
