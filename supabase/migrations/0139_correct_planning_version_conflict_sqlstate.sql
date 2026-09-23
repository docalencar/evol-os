-- PLN-DB3 - deterministic SQLSTATE for Planning version conflicts.
--
-- A stale `p_expected_version` is a DETERMINISTIC business conflict: the caller
-- read version N, the row is now at N+1, and no retry can ever succeed. It was
-- raised as SQLSTATE 40001 (`serialization_failure`), which by convention means
-- "transient, retry me". Measured locally through PostgREST, the 40001 form was
-- executed 70,598 times and never settled, returning HTTP 504 after ~64s; the
-- identical raise under P0001 executed once, settled in 1.17s, and returned
-- HTTP 400 carrying `PLANNING_VERSION_CONFLICT`.
--
-- This migration changes ONLY the errcode, and only where the message is
-- PLANNING_VERSION_CONFLICT. It is a pure CREATE OR REPLACE of eight existing
-- bodies, generated from the committed text of 0135/0137/0138 so that no body
-- is retyped:
--
--   0135  transition_planning_scenario_v1
--   0137  create_planning_scenario_branch_v1, rename_planning_scenario_v1,
--         delete_planning_scenario_v1
--   0138  create_planning_change_set_v1, replace_planning_change_set_v1,
--         remove_planning_change_set_v1, reorder_planning_change_sets_v1
--
-- P0001 (`raise_exception`) is not new vocabulary: `publish_planning_scenario`
-- (0050) already raises PLANNING_VERSION_CONFLICT as P0001 and its pgTAP already
-- asserts P0001. This makes the Planning surface internally consistent.
--
-- PRESERVED, deliberately and verifiably:
--   * signatures, argument names, return types, volatility;
--   * SECURITY DEFINER and `set search_path = public, pg_temp`;
--   * SELECT ... FOR UPDATE row locking and the order of every guard;
--   * the exact message PLANNING_VERSION_CONFLICT;
--   * every other errcode (42501, P0002, 22023, 55000, 23505);
--   * privileges and ownership - CREATE OR REPLACE retains both, so this
--     migration issues no GRANT and no REVOKE and the ACL fingerprint is
--     unchanged by construction;
--   * genuine serialization/deadlock semantics - PostgreSQL still raises real
--     40001/40P01 itself and nothing here suppresses that.
--
-- OUT OF SCOPE, recorded not fixed: DEVELOPMENT_VERSION_CONFLICT (0130, five
-- sites), TENANT_CONFLICT (0074/0075, seven sites) and the approval boundary
-- (0046, two sites) carry the same latent exposure. They are separate surfaces
-- with their own tests and consumers, and one of them
-- (approval-request-repository) actively branches on code 40001. Folding them
-- in would make this slice unreviewable.

-- from 0135_create_planning_trusted_lifecycle_boundary.sql (1 conflict raise)
create or replace function public.transition_planning_scenario_v1(
  p_scenario_id uuid,
  p_transition text,
  p_expected_version integer,
  p_idempotency_key uuid,
  p_reason text default null
) returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare
  v_scenario public.organization_planning_scenarios%rowtype;
  v_existing public.organization_planning_lifecycle_audit%rowtype;
  v_role text;
  v_from text;
  v_to text;
  v_event text;
  v_reason text := nullif(btrim(p_reason), '');
  v_now timestamptz;
  v_fingerprint text;
begin
  if auth.uid() is null then
    raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED';
  end if;
  if p_idempotency_key is null or p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode='22023',message='PLANNING_LIFECYCLE_INPUT_INVALID';
  end if;
  if p_transition not in ('submit','approve','reject','revise') then
    raise exception using errcode='22023',message='PLANNING_LIFECYCLE_TRANSITION_UNKNOWN';
  end if;
  if p_transition = 'reject' then
    if v_reason is null or char_length(v_reason) > 500 then
      raise exception using errcode='22023',message='PLANNING_REJECTION_REASON_INVALID';
    end if;
  elsif v_reason is not null then
    raise exception using errcode='22023',message='PLANNING_REASON_NOT_ALLOWED';
  end if;

  v_fingerprint := concat_ws(':',p_scenario_id,p_transition,p_expected_version,coalesce(v_reason,''));
  select * into v_existing from public.organization_planning_lifecycle_audit
  where idempotency_key=p_idempotency_key;
  if found then
    if v_existing.actor_user_id<>auth.uid()
      or v_existing.scenario_id<>p_scenario_id
      or v_existing.intent_fingerprint<>v_fingerprint then
      raise exception using errcode='23505',message='PLANNING_IDEMPOTENCY_CONFLICT';
    end if;
    select * into v_scenario from public.organization_planning_scenarios
    where id=p_scenario_id and company_id=v_existing.company_id;
    return jsonb_build_object('scenarioId',v_scenario.id,'status',v_scenario.status,
      'version',v_scenario.version,'updatedAt',v_scenario.updated_at,
      'auditId',v_existing.id,'idempotent',true);
  end if;

  select * into v_scenario from public.organization_planning_scenarios
  where id=p_scenario_id for update;
  if not found then
    raise exception using errcode='P0002',message='PLANNING_RESOURCE_UNAVAILABLE';
  end if;
  select membership.role into v_role from public.company_members membership
  where membership.company_id=v_scenario.company_id and membership.user_id=auth.uid()
    and membership.status='active' and membership.role in ('owner','admin','hr')
  limit 1;
  if v_role is null then
    raise exception using errcode='P0002',message='PLANNING_RESOURCE_UNAVAILABLE';
  end if;
  if p_expected_version<>v_scenario.version then
    raise exception using errcode='P0001',message='PLANNING_VERSION_CONFLICT';
  end if;

  v_from:=v_scenario.status;
  case p_transition
    when 'submit' then v_to:='submitted'; v_event:='planning.scenario.submitted';
    when 'approve' then v_to:='approved'; v_event:='planning.scenario.approved';
    when 'reject' then v_to:='rejected'; v_event:='planning.scenario.rejected';
    when 'revise' then v_to:='draft'; v_event:='planning.scenario.revision_started';
  end case;
  if not ((v_from='draft' and v_to='submitted')
    or (v_from='submitted' and v_to in ('approved','rejected'))
    or (v_from='rejected' and v_to='draft')) then
    raise exception using errcode='55000',message='PLANNING_TRANSITION_INVALID';
  end if;

  v_now:=clock_timestamp();
  update public.organization_planning_scenarios
  set status=v_to,version=version+1,updated_at=v_now
  where id=v_scenario.id;
  insert into public.organization_planning_lifecycle_audit(
    company_id,scenario_id,actor_user_id,actor_role,event_type,from_status,
    to_status,resulting_version,reason,idempotency_key,intent_fingerprint,occurred_at
  ) values (
    v_scenario.company_id,v_scenario.id,auth.uid(),v_role,v_event,v_from,
    v_to,v_scenario.version+1,case when p_transition='reject' then v_reason end,
    p_idempotency_key,v_fingerprint,v_now
  ) returning id into v_existing.id;
  return jsonb_build_object('scenarioId',v_scenario.id,'status',v_to,
    'version',v_scenario.version+1,'updatedAt',v_now,
    'auditId',v_existing.id,'idempotent',false);
end; $$;

-- from 0137_create_planning_operational_trusted_boundary.sql (1 conflict raise)
create or replace function public.create_planning_scenario_branch_v1(
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
    raise exception using errcode='P0001',message='PLANNING_VERSION_CONFLICT'; end if;
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

-- from 0137_create_planning_operational_trusted_boundary.sql (1 conflict raise)
create or replace function public.rename_planning_scenario_v1(
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
  if p_expected_version<>v_scenario.version then raise exception using errcode='P0001',message='PLANNING_VERSION_CONFLICT'; end if;
  if v_scenario.status<>'draft' then raise exception using errcode='55000',message='PLANNING_RENAME_REQUIRES_DRAFT'; end if;
  if char_length(btrim(coalesce(p_name,''))) not between 2 and 120 then
    raise exception using errcode='22023',message='PLANNING_SCENARIO_INPUT_INVALID'; end if;
  v_now:=clock_timestamp();
  update public.organization_planning_scenarios set name=btrim(p_name),version=version+1,updated_at=v_now
    where id=v_scenario.id returning * into v_scenario;
  return to_jsonb(v_scenario);
end; $$;

-- from 0137_create_planning_operational_trusted_boundary.sql (1 conflict raise)
create or replace function public.delete_planning_scenario_v1(
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
  if p_expected_version<>v_scenario.version then raise exception using errcode='P0001',message='PLANNING_VERSION_CONFLICT'; end if;
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

-- from 0138_create_planning_change_set_mutation_boundary.sql (1 conflict raise)
create or replace function public.create_planning_change_set_v1(
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
    raise exception using errcode='P0001',message='PLANNING_VERSION_CONFLICT';
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

-- from 0138_create_planning_change_set_mutation_boundary.sql (1 conflict raise)
create or replace function public.replace_planning_change_set_v1(
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
    raise exception using errcode='P0001',message='PLANNING_VERSION_CONFLICT';
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

-- from 0138_create_planning_change_set_mutation_boundary.sql (1 conflict raise)
create or replace function public.remove_planning_change_set_v1(
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
    raise exception using errcode='P0001',message='PLANNING_VERSION_CONFLICT';
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

-- from 0138_create_planning_change_set_mutation_boundary.sql (1 conflict raise)
create or replace function public.reorder_planning_change_sets_v1(
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
    raise exception using errcode='P0001',message='PLANNING_VERSION_CONFLICT';
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
