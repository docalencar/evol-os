-- PLN-P5A — trusted draft content mutation boundary for Organization Planning.

create function public.create_planning_change_set_v1(
  p_scenario_id uuid,
  p_expected_version integer,
  p_change_set_id uuid,
  p_change_type text,
  p_payload jsonb
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_scenario public.organization_planning_scenarios%rowtype;
  v_change_set public.organization_planning_change_sets%rowtype;
  v_now timestamptz := clock_timestamp();
  v_next_order integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select * into v_scenario
  from public.organization_planning_scenarios
  where id = p_scenario_id
  for update;

  if not found or not exists (
    select 1 from public.company_members membership
    where membership.company_id = v_scenario.company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'hr')
  ) then
    raise exception using errcode = 'P0002', message = 'PLANNING_RESOURCE_UNAVAILABLE';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'PLANNING_EXPECTED_VERSION_INVALID';
  end if;
  if p_expected_version <> v_scenario.version then
    raise exception using errcode = '40001', message = 'PLANNING_VERSION_CONFLICT';
  end if;
  if v_scenario.status <> 'draft' then
    raise exception using errcode = '55000', message = 'PLANNING_CONTENT_REQUIRES_DRAFT';
  end if;
  if p_change_set_id is null or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or btrim(coalesce(p_change_type, '')) not in (
      'department.create', 'department.update', 'department.archive',
      'team.create', 'team.update', 'team.archive',
      'position.create', 'position.update', 'position.archive', 'position.move',
      'employee.create', 'employee.update', 'employee.transfer', 'employee.terminate',
      'vacancy.create', 'vacancy.update', 'vacancy.close'
    ) then
    raise exception using errcode = '22023', message = 'PLANNING_CHANGE_SET_INPUT_INVALID';
  end if;

  select coalesce(max(change_set.version), 0) + 1 into v_next_order
  from public.organization_planning_change_sets change_set
  where change_set.scenario_id = v_scenario.id
    and change_set.active
    and change_set.archived_at is null
    and change_set.superseded_by is null;

  insert into public.organization_planning_change_sets(
    id, company_id, scenario_id, change_type, payload, version,
    active, superseded_by, archived_at, created_at, updated_at
  ) values (
    p_change_set_id, v_scenario.company_id, v_scenario.id, btrim(p_change_type),
    p_payload, v_next_order, true, null, null, v_now, v_now
  ) returning * into v_change_set;

  update public.organization_planning_scenarios
  set version = version + 1, updated_at = v_now
  where id = v_scenario.id
  returning * into v_scenario;

  return jsonb_build_object(
    'scenario', to_jsonb(v_scenario),
    'changeSet', to_jsonb(v_change_set)
  );
end;
$$;

create function public.replace_planning_change_set_v1(
  p_scenario_id uuid,
  p_expected_version integer,
  p_change_set_id uuid,
  p_replacement_id uuid,
  p_change_type text,
  p_payload jsonb
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_scenario public.organization_planning_scenarios%rowtype;
  v_current public.organization_planning_change_sets%rowtype;
  v_replacement public.organization_planning_change_sets%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  select * into v_scenario from public.organization_planning_scenarios
  where id = p_scenario_id for update;
  if not found or not exists (
    select 1 from public.company_members membership
    where membership.company_id = v_scenario.company_id
      and membership.user_id = auth.uid() and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'hr')
  ) then
    raise exception using errcode = 'P0002', message = 'PLANNING_RESOURCE_UNAVAILABLE';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'PLANNING_EXPECTED_VERSION_INVALID';
  end if;
  if p_expected_version <> v_scenario.version then
    raise exception using errcode = '40001', message = 'PLANNING_VERSION_CONFLICT';
  end if;
  if v_scenario.status <> 'draft' then
    raise exception using errcode = '55000', message = 'PLANNING_CONTENT_REQUIRES_DRAFT';
  end if;
  if p_replacement_id is null or p_replacement_id = p_change_set_id
    or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or btrim(coalesce(p_change_type, '')) not in (
      'department.create', 'department.update', 'department.archive',
      'team.create', 'team.update', 'team.archive',
      'position.create', 'position.update', 'position.archive', 'position.move',
      'employee.create', 'employee.update', 'employee.transfer', 'employee.terminate',
      'vacancy.create', 'vacancy.update', 'vacancy.close'
    ) then
    raise exception using errcode = '22023', message = 'PLANNING_CHANGE_SET_INPUT_INVALID';
  end if;

  select * into v_current from public.organization_planning_change_sets
  where id = p_change_set_id and scenario_id = v_scenario.id
    and active and archived_at is null and superseded_by is null
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'PLANNING_RESOURCE_UNAVAILABLE';
  end if;

  insert into public.organization_planning_change_sets(
    id, company_id, scenario_id, change_type, payload, version,
    active, superseded_by, archived_at, created_at, updated_at
  ) values (
    p_replacement_id, v_scenario.company_id, v_scenario.id, btrim(p_change_type),
    p_payload, v_current.version, true, null, null, v_now, v_now
  ) returning * into v_replacement;

  update public.organization_planning_change_sets
  set active = false, superseded_by = v_replacement.id,
      archived_at = v_now, updated_at = v_now
  where id = v_current.id;

  update public.organization_planning_scenarios
  set version = version + 1, updated_at = v_now
  where id = v_scenario.id
  returning * into v_scenario;

  return jsonb_build_object(
    'scenario', to_jsonb(v_scenario),
    'changeSet', to_jsonb(v_replacement),
    'supersededChangeSetId', v_current.id
  );
end;
$$;

create function public.remove_planning_change_set_v1(
  p_scenario_id uuid,
  p_expected_version integer,
  p_change_set_id uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_scenario public.organization_planning_scenarios%rowtype;
  v_removed public.organization_planning_change_sets%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  select * into v_scenario from public.organization_planning_scenarios
  where id = p_scenario_id for update;
  if not found or not exists (
    select 1 from public.company_members membership
    where membership.company_id = v_scenario.company_id
      and membership.user_id = auth.uid() and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'hr')
  ) then
    raise exception using errcode = 'P0002', message = 'PLANNING_RESOURCE_UNAVAILABLE';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'PLANNING_EXPECTED_VERSION_INVALID';
  end if;
  if p_expected_version <> v_scenario.version then
    raise exception using errcode = '40001', message = 'PLANNING_VERSION_CONFLICT';
  end if;
  if v_scenario.status <> 'draft' then
    raise exception using errcode = '55000', message = 'PLANNING_CONTENT_REQUIRES_DRAFT';
  end if;

  update public.organization_planning_change_sets
  set active = false, archived_at = v_now, updated_at = v_now
  where id = p_change_set_id and scenario_id = v_scenario.id
    and active and archived_at is null and superseded_by is null
  returning * into v_removed;
  if not found then
    raise exception using errcode = 'P0002', message = 'PLANNING_RESOURCE_UNAVAILABLE';
  end if;

  update public.organization_planning_scenarios
  set version = version + 1, updated_at = v_now
  where id = v_scenario.id
  returning * into v_scenario;

  return jsonb_build_object(
    'scenario', to_jsonb(v_scenario),
    'removedChangeSet', to_jsonb(v_removed)
  );
end;
$$;

create function public.reorder_planning_change_sets_v1(
  p_scenario_id uuid,
  p_expected_version integer,
  p_ordered_change_set_ids uuid[]
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_scenario public.organization_planning_scenarios%rowtype;
  v_now timestamptz := clock_timestamp();
  v_active_count integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  select * into v_scenario from public.organization_planning_scenarios
  where id = p_scenario_id for update;
  if not found or not exists (
    select 1 from public.company_members membership
    where membership.company_id = v_scenario.company_id
      and membership.user_id = auth.uid() and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'hr')
  ) then
    raise exception using errcode = 'P0002', message = 'PLANNING_RESOURCE_UNAVAILABLE';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'PLANNING_EXPECTED_VERSION_INVALID';
  end if;
  if p_expected_version <> v_scenario.version then
    raise exception using errcode = '40001', message = 'PLANNING_VERSION_CONFLICT';
  end if;
  if v_scenario.status <> 'draft' then
    raise exception using errcode = '55000', message = 'PLANNING_CONTENT_REQUIRES_DRAFT';
  end if;

  select count(*) into v_active_count
  from public.organization_planning_change_sets change_set
  where change_set.scenario_id = v_scenario.id
    and change_set.active and change_set.archived_at is null
    and change_set.superseded_by is null;

  if p_ordered_change_set_ids is null
    or cardinality(p_ordered_change_set_ids) <> v_active_count
    or exists (select 1 from unnest(p_ordered_change_set_ids) id where id is null)
    or (select count(distinct id) from unnest(p_ordered_change_set_ids) id)
       <> cardinality(p_ordered_change_set_ids)
    or exists (
      select 1 from unnest(p_ordered_change_set_ids) id
      where not exists (
        select 1 from public.organization_planning_change_sets change_set
        where change_set.id = id and change_set.scenario_id = v_scenario.id
          and change_set.active and change_set.archived_at is null
          and change_set.superseded_by is null
      )
    ) then
    raise exception using errcode = '22023', message = 'PLANNING_CHANGE_SET_ORDER_INVALID';
  end if;

  update public.organization_planning_change_sets change_set
  set version = ordered.ordinality, updated_at = v_now
  from unnest(p_ordered_change_set_ids) with ordinality ordered(id, ordinality)
  where change_set.id = ordered.id and change_set.scenario_id = v_scenario.id;

  update public.organization_planning_scenarios
  set version = version + 1, updated_at = v_now
  where id = v_scenario.id
  returning * into v_scenario;

  return jsonb_build_object(
    'scenario', to_jsonb(v_scenario),
    'changeSets', coalesce((
      select jsonb_agg(to_jsonb(change_set) order by change_set.version, change_set.id)
      from public.organization_planning_change_sets change_set
      where change_set.scenario_id = v_scenario.id
        and change_set.active and change_set.archived_at is null
        and change_set.superseded_by is null
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function
  public.create_planning_change_set_v1(uuid, integer, uuid, text, jsonb),
  public.replace_planning_change_set_v1(uuid, integer, uuid, uuid, text, jsonb),
  public.remove_planning_change_set_v1(uuid, integer, uuid),
  public.reorder_planning_change_sets_v1(uuid, integer, uuid[])
from public, anon, authenticated, service_role;

grant execute on function
  public.create_planning_change_set_v1(uuid, integer, uuid, text, jsonb),
  public.replace_planning_change_set_v1(uuid, integer, uuid, uuid, text, jsonb),
  public.remove_planning_change_set_v1(uuid, integer, uuid),
  public.reorder_planning_change_sets_v1(uuid, integer, uuid[])
to authenticated;

notify pgrst, 'reload schema';
