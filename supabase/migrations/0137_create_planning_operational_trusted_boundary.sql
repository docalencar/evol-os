-- PLN-DB2 — trusted operational boundary for Organization Planning.

create function public.get_planning_workspaces_v1(p_company_id uuid)
returns setof public.organization_planning_workspaces
language sql stable security definer set search_path=public,pg_temp as $$
  select workspace.* from public.organization_planning_workspaces workspace
  where workspace.company_id=p_company_id and exists (
    select 1 from public.company_members membership
    where membership.company_id=workspace.company_id and membership.user_id=auth.uid()
      and membership.status='active');
$$;

create function public.get_planning_scenarios_v1(p_company_id uuid)
returns setof public.organization_planning_scenarios
language sql stable security definer set search_path=public,pg_temp as $$
  select scenario.* from public.organization_planning_scenarios scenario
  where scenario.company_id=p_company_id and exists (
    select 1 from public.company_members membership
    where membership.company_id=scenario.company_id and membership.user_id=auth.uid()
      and membership.status='active');
$$;

create function public.get_planning_snapshots_v1(p_company_id uuid)
returns setof public.organization_planning_snapshots
language sql stable security definer set search_path=public,pg_temp as $$
  select snapshot.* from public.organization_planning_snapshots snapshot
  where snapshot.company_id=p_company_id and exists (
    select 1 from public.company_members membership
    where membership.company_id=snapshot.company_id and membership.user_id=auth.uid()
      and membership.status='active');
$$;

create function public.get_planning_change_sets_v1(p_scenario_id uuid)
returns setof public.organization_planning_change_sets
language sql stable security definer set search_path=public,pg_temp as $$
  select change_set.* from public.organization_planning_change_sets change_set
  join public.company_members membership
    on membership.company_id=change_set.company_id and membership.user_id=auth.uid()
   and membership.status='active'
  where change_set.scenario_id=p_scenario_id and change_set.active
    and change_set.archived_at is null and change_set.superseded_by is null
  order by change_set.version,change_set.id;
$$;

create function public.bootstrap_planning_workspace_v1(
  p_company_id uuid,p_workspace_id uuid,p_snapshot_id uuid,p_organization jsonb
) returns jsonb language plpgsql volatile security definer
set search_path=public,pg_temp as $$
declare v_workspace public.organization_planning_workspaces%rowtype;
  v_snapshot public.organization_planning_snapshots%rowtype; v_now timestamptz;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not exists(select 1 from public.company_members m where m.company_id=p_company_id
    and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','hr')) then
    raise exception using errcode='P0002',message='PLANNING_RESOURCE_UNAVAILABLE'; end if;
  if p_workspace_id is null or p_snapshot_id is null or p_organization is null
    or jsonb_typeof(p_organization)<>'object' then
    raise exception using errcode='22023',message='PLANNING_BASELINE_INPUT_INVALID'; end if;
  if exists(select 1 from public.organization_planning_workspaces where company_id=p_company_id) then
    raise exception using errcode='23505',message='PLANNING_BASELINE_ALREADY_EXISTS'; end if;
  v_now:=clock_timestamp();
  insert into public.organization_planning_workspaces(id,company_id,version,created_at,updated_at)
    values(p_workspace_id,p_company_id,1,v_now,v_now) returning * into v_workspace;
  insert into public.organization_planning_snapshots(
    id,company_id,workspace_id,source_scenario_id,version,published_at,organization,kind)
    values(p_snapshot_id,p_company_id,p_workspace_id,null,1,v_now,p_organization,'baseline')
    returning * into v_snapshot;
  return jsonb_build_object('workspace',to_jsonb(v_workspace),'snapshot',to_jsonb(v_snapshot));
end; $$;

create function public.create_planning_scenario_v1(
  p_workspace_id uuid,p_base_snapshot_id uuid,p_scenario_id uuid,
  p_name text,p_description text default null
) returns jsonb language plpgsql volatile security definer
set search_path=public,pg_temp as $$
declare v_company_id uuid; v_now timestamptz; v_scenario public.organization_planning_scenarios%rowtype;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select workspace.company_id into v_company_id from public.organization_planning_workspaces workspace
    join public.organization_planning_snapshots snapshot on snapshot.id=p_base_snapshot_id
      and snapshot.workspace_id=workspace.id and snapshot.company_id=workspace.company_id
    where workspace.id=p_workspace_id;
  if v_company_id is null or not exists(select 1 from public.company_members m
    where m.company_id=v_company_id and m.user_id=auth.uid() and m.status='active'
      and m.role in ('owner','admin','hr')) then
    raise exception using errcode='P0002',message='PLANNING_RESOURCE_UNAVAILABLE'; end if;
  if p_scenario_id is null or char_length(btrim(coalesce(p_name,''))) not between 2 and 120
    or char_length(coalesce(p_description,''))>500 then
    raise exception using errcode='22023',message='PLANNING_SCENARIO_INPUT_INVALID'; end if;
  v_now:=clock_timestamp();
  insert into public.organization_planning_scenarios(
    id,company_id,workspace_id,base_snapshot_id,parent_scenario_id,branch_depth,branch_path,
    name,description,status,version,created_at,updated_at)
  values(p_scenario_id,v_company_id,p_workspace_id,p_base_snapshot_id,null,0,p_scenario_id::text,
    btrim(p_name),nullif(btrim(p_description),''),'draft',1,v_now,v_now)
  returning * into v_scenario;
  return to_jsonb(v_scenario);
end; $$;

create function public.create_planning_scenario_branch_v1(
  p_source_scenario_id uuid,p_expected_version integer,p_scenario_id uuid
) returns jsonb language plpgsql volatile security definer
set search_path=public,pg_temp as $$
declare v_source public.organization_planning_scenarios%rowtype;
  v_scenario public.organization_planning_scenarios%rowtype; v_now timestamptz;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_source from public.organization_planning_scenarios
    where id=p_source_scenario_id for update;
  if not found or not exists(select 1 from public.company_members m
    where m.company_id=v_source.company_id and m.user_id=auth.uid() and m.status='active'
      and m.role in ('owner','admin','hr')) then
    raise exception using errcode='P0002',message='PLANNING_RESOURCE_UNAVAILABLE'; end if;
  if p_expected_version<>v_source.version then
    raise exception using errcode='40001',message='PLANNING_VERSION_CONFLICT'; end if;
  if p_scenario_id is null then raise exception using errcode='22023',message='PLANNING_SCENARIO_INPUT_INVALID'; end if;
  v_now:=clock_timestamp();
  insert into public.organization_planning_scenarios(
    id,company_id,workspace_id,base_snapshot_id,parent_scenario_id,branch_depth,branch_path,
    name,description,status,version,created_at,updated_at)
  values(p_scenario_id,v_source.company_id,v_source.workspace_id,v_source.base_snapshot_id,
    v_source.id,v_source.branch_depth+1,v_source.branch_path||'/'||p_scenario_id,
    v_source.name,v_source.description,'draft',1,v_now,v_now)
  returning * into v_scenario;
  return to_jsonb(v_scenario);
end; $$;

create function public.rename_planning_scenario_v1(
  p_scenario_id uuid,p_expected_version integer,p_name text
) returns jsonb language plpgsql volatile security definer
set search_path=public,pg_temp as $$
declare v_scenario public.organization_planning_scenarios%rowtype; v_now timestamptz;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_scenario from public.organization_planning_scenarios where id=p_scenario_id for update;
  if not found or not exists(select 1 from public.company_members m
    where m.company_id=v_scenario.company_id and m.user_id=auth.uid() and m.status='active'
      and m.role in ('owner','admin','hr')) then
    raise exception using errcode='P0002',message='PLANNING_RESOURCE_UNAVAILABLE'; end if;
  if p_expected_version<>v_scenario.version then raise exception using errcode='40001',message='PLANNING_VERSION_CONFLICT'; end if;
  if v_scenario.status<>'draft' then raise exception using errcode='55000',message='PLANNING_RENAME_REQUIRES_DRAFT'; end if;
  if char_length(btrim(coalesce(p_name,''))) not between 2 and 120 then
    raise exception using errcode='22023',message='PLANNING_SCENARIO_INPUT_INVALID'; end if;
  v_now:=clock_timestamp();
  update public.organization_planning_scenarios set name=btrim(p_name),version=version+1,updated_at=v_now
    where id=v_scenario.id returning * into v_scenario;
  return to_jsonb(v_scenario);
end; $$;

create function public.delete_planning_scenario_v1(
  p_scenario_id uuid,p_expected_version integer
) returns jsonb language plpgsql volatile security definer
set search_path=public,pg_temp as $$
declare v_scenario public.organization_planning_scenarios%rowtype;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_scenario from public.organization_planning_scenarios where id=p_scenario_id for update;
  if not found or not exists(select 1 from public.company_members m
    where m.company_id=v_scenario.company_id and m.user_id=auth.uid() and m.status='active'
      and m.role in ('owner','admin','hr')) then
    raise exception using errcode='P0002',message='PLANNING_RESOURCE_UNAVAILABLE'; end if;
  if p_expected_version<>v_scenario.version then raise exception using errcode='40001',message='PLANNING_VERSION_CONFLICT'; end if;
  if v_scenario.status<>'draft' then raise exception using errcode='55000',message='PLANNING_SCENARIO_DELETE_REQUIRES_DRAFT'; end if;
  if exists(select 1 from public.organization_planning_scenarios where parent_scenario_id=v_scenario.id) then
    raise exception using errcode='55000',message='PLANNING_SCENARIO_HAS_CHILDREN'; end if;
  if exists(select 1 from public.organization_planning_snapshots where source_scenario_id=v_scenario.id) then
    raise exception using errcode='55000',message='PLANNING_SCENARIO_HAS_PUBLISHED_SNAPSHOT'; end if;
  delete from public.organization_planning_change_sets where scenario_id=v_scenario.id;
  delete from public.organization_planning_scenarios where id=v_scenario.id;
  return jsonb_build_object('scenarioId',v_scenario.id,'deleted',true,
    'expectedVersion',p_expected_version);
end; $$;

revoke all on function
  public.get_planning_workspaces_v1(uuid),public.get_planning_scenarios_v1(uuid),
  public.get_planning_snapshots_v1(uuid),public.get_planning_change_sets_v1(uuid),
  public.bootstrap_planning_workspace_v1(uuid,uuid,uuid,jsonb),
  public.create_planning_scenario_v1(uuid,uuid,uuid,text,text),
  public.create_planning_scenario_branch_v1(uuid,integer,uuid),
  public.rename_planning_scenario_v1(uuid,integer,text),
  public.delete_planning_scenario_v1(uuid,integer)
from public,anon,authenticated,service_role;

grant execute on function
  public.get_planning_workspaces_v1(uuid),public.get_planning_scenarios_v1(uuid),
  public.get_planning_snapshots_v1(uuid),public.get_planning_change_sets_v1(uuid),
  public.bootstrap_planning_workspace_v1(uuid,uuid,uuid,jsonb),
  public.create_planning_scenario_v1(uuid,uuid,uuid,text,text),
  public.create_planning_scenario_branch_v1(uuid,integer,uuid),
  public.rename_planning_scenario_v1(uuid,integer,text),
  public.delete_planning_scenario_v1(uuid,integer)
to authenticated;

notify pgrst,'reload schema';
