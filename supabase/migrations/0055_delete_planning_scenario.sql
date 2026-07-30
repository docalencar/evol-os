-- PR-096 — Scenario Operations
create or replace function public.delete_planning_scenario(
  p_company_id uuid,
  p_scenario_id uuid,
  p_expected_version integer
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scenario public.organization_planning_scenarios%rowtype;
begin
  select * into v_scenario
  from public.organization_planning_scenarios
  where company_id = p_company_id and id = p_scenario_id
  for update;

  if not found then raise exception 'PLANNING_SCENARIO_NOT_FOUND'; end if;
  if v_scenario.version <> p_expected_version then raise exception 'PLANNING_VERSION_CONFLICT'; end if;
  if v_scenario.status <> 'draft' then raise exception 'PLANNING_SCENARIO_DELETE_REQUIRES_DRAFT'; end if;
  if exists (select 1 from public.organization_planning_scenarios where company_id = p_company_id and parent_scenario_id = p_scenario_id) then
    raise exception 'PLANNING_SCENARIO_HAS_CHILDREN';
  end if;
  if exists (select 1 from public.organization_planning_snapshots where company_id = p_company_id and source_scenario_id = p_scenario_id) then
    raise exception 'PLANNING_SCENARIO_HAS_PUBLISHED_SNAPSHOT';
  end if;

  update public.organization_planning_change_sets
  set superseded_by = null
  where company_id = p_company_id and scenario_id = p_scenario_id;

  delete from public.organization_planning_change_sets
  where company_id = p_company_id and scenario_id = p_scenario_id;

  delete from public.organization_planning_scenarios
  where company_id = p_company_id and id = p_scenario_id;
end;
$$;
