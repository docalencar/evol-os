-- PR-086E — Atomic Organization Planning scenario publication

create or replace function public.publish_planning_scenario(
  p_company_id uuid,
  p_scenario_id uuid,
  p_expected_version integer,
  p_snapshot_id uuid,
  p_published_at timestamptz
)
returns table (
  scenario_id uuid,
  scenario_company_id uuid,
  scenario_workspace_id uuid,
  scenario_base_snapshot_id uuid,
  scenario_name text,
  scenario_description text,
  scenario_status text,
  scenario_version integer,
  scenario_created_at timestamptz,
  scenario_updated_at timestamptz,
  snapshot_id uuid,
  snapshot_company_id uuid,
  snapshot_workspace_id uuid,
  snapshot_source_scenario_id uuid,
  snapshot_version integer,
  snapshot_published_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scenario public.organization_planning_scenarios%rowtype;
  v_snapshot public.organization_planning_snapshots%rowtype;
  v_next_snapshot_version integer;
begin
  if p_published_at is null then
    raise exception 'PLANNING_PUBLISHED_AT_IS_REQUIRED';
  end if;

  select scenario.*
  into v_scenario
  from public.organization_planning_scenarios as scenario
  where scenario.company_id = p_company_id
    and scenario.id = p_scenario_id
  for update;

  if not found then
    raise exception 'PLANNING_SCENARIO_NOT_FOUND';
  end if;

  if v_scenario.status <> 'approved' then
    raise exception 'PLANNING_SCENARIO_MUST_BE_APPROVED';
  end if;

  if v_scenario.version <> p_expected_version then
    raise exception 'PLANNING_VERSION_CONFLICT';
  end if;

  perform 1
  from public.organization_planning_workspaces as workspace
  where workspace.id = v_scenario.workspace_id
    and workspace.company_id = p_company_id
  for update;

  if not found then
    raise exception 'PLANNING_WORKSPACE_NOT_FOUND';
  end if;

  select coalesce(max(snapshot.version), 0) + 1
  into v_next_snapshot_version
  from public.organization_planning_snapshots as snapshot
  where snapshot.workspace_id = v_scenario.workspace_id;

  insert into public.organization_planning_snapshots (
    id,
    company_id,
    workspace_id,
    source_scenario_id,
    version,
    published_at
  ) values (
    p_snapshot_id,
    p_company_id,
    v_scenario.workspace_id,
    v_scenario.id,
    v_next_snapshot_version,
    p_published_at
  )
  returning * into v_snapshot;

  update public.organization_planning_scenarios as scenario
  set status = 'published',
      version = scenario.version + 1,
      updated_at = p_published_at
  where scenario.id = v_scenario.id
    and scenario.company_id = p_company_id
  returning scenario.* into v_scenario;

  return query
  select
    v_scenario.id,
    v_scenario.company_id,
    v_scenario.workspace_id,
    v_scenario.base_snapshot_id,
    v_scenario.name,
    v_scenario.description,
    v_scenario.status,
    v_scenario.version,
    v_scenario.created_at,
    v_scenario.updated_at,
    v_snapshot.id,
    v_snapshot.company_id,
    v_snapshot.workspace_id,
    v_snapshot.source_scenario_id,
    v_snapshot.version,
    v_snapshot.published_at;
end;
$$;

revoke all on function public.publish_planning_scenario(
  uuid,
  uuid,
  integer,
  uuid,
  timestamptz
) from public;

grant execute on function public.publish_planning_scenario(
  uuid,
  uuid,
  integer,
  uuid,
  timestamptz
) to authenticated;

comment on function public.publish_planning_scenario(
  uuid,
  uuid,
  integer,
  uuid,
  timestamptz
) is
  'Publica um cenário aprovado e cria seu snapshot em uma única transação PostgreSQL.';
