begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select no_plan();

-- Static boundary: RLS, effective table ACLs, and retired invoker RPCs.
select ok((select relrowsecurity from pg_class where oid='public.organization_planning_workspaces'::regclass),'workspaces RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.organization_planning_scenarios'::regclass),'scenarios RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.organization_planning_snapshots'::regclass),'snapshots RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.organization_planning_change_sets'::regclass),'change sets RLS enabled');

select ok((select bool_and(not has_table_privilege('public',t,p)) from unnest(array[
  'public.organization_planning_workspaces'::regclass,'public.organization_planning_scenarios'::regclass,
  'public.organization_planning_snapshots'::regclass,'public.organization_planning_change_sets'::regclass
]) t, unnest(array['select','insert','update','delete']) p),'PUBLIC has no Planning table DML ACL');
select ok((select bool_and(not has_table_privilege('anon',t,p)) from unnest(array[
  'public.organization_planning_workspaces'::regclass,'public.organization_planning_scenarios'::regclass,
  'public.organization_planning_snapshots'::regclass,'public.organization_planning_change_sets'::regclass
]) t, unnest(array['select','insert','update','delete']) p),'anon has no Planning table DML ACL');
select ok((select bool_and(not has_table_privilege('authenticated',t,p)) from unnest(array[
  'public.organization_planning_workspaces'::regclass,'public.organization_planning_scenarios'::regclass,
  'public.organization_planning_snapshots'::regclass,'public.organization_planning_change_sets'::regclass
]) t, unnest(array['select','insert','update','delete']) p),'authenticated has no Planning table DML ACL');

select ok((select bool_and(not p.prosecdef and p.proconfig=array['search_path=public']::text[]) from pg_proc p where p.oid in (
  'public.bootstrap_planning_workspace(uuid,uuid,uuid,timestamp with time zone,jsonb)'::regprocedure,
  'public.publish_planning_scenario(uuid,uuid,integer,uuid,timestamp with time zone,jsonb,jsonb)'::regprocedure,
  'public.delete_planning_scenario(uuid,uuid,integer)'::regprocedure
)),'the three legacy Planning RPCs remain SECURITY INVOKER internals');
select ok(not has_function_privilege('public','public.bootstrap_planning_workspace(uuid,uuid,uuid,timestamp with time zone,jsonb)','execute'),'PUBLIC cannot execute bootstrap');
select ok(not has_function_privilege('anon','public.bootstrap_planning_workspace(uuid,uuid,uuid,timestamp with time zone,jsonb)','execute'),'anon cannot execute bootstrap');
select ok(not has_function_privilege('authenticated','public.bootstrap_planning_workspace(uuid,uuid,uuid,timestamp with time zone,jsonb)','execute'),'authenticated cannot execute legacy bootstrap');
select ok(not has_function_privilege('public','public.publish_planning_scenario(uuid,uuid,integer,uuid,timestamp with time zone,jsonb,jsonb)','execute'),'PUBLIC cannot execute publish');
select ok(not has_function_privilege('anon','public.publish_planning_scenario(uuid,uuid,integer,uuid,timestamp with time zone,jsonb,jsonb)','execute'),'anon cannot execute publish');
select ok(not has_function_privilege('authenticated','public.publish_planning_scenario(uuid,uuid,integer,uuid,timestamp with time zone,jsonb,jsonb)','execute'),'authenticated cannot execute legacy publish');
select ok(not has_function_privilege('public','public.delete_planning_scenario(uuid,uuid,integer)','execute'),'PUBLIC cannot execute legacy delete');
select ok(not has_function_privilege('anon','public.delete_planning_scenario(uuid,uuid,integer)','execute'),'anon cannot execute legacy delete');
select ok(not has_function_privilege('authenticated','public.delete_planning_scenario(uuid,uuid,integer)','execute'),'authenticated cannot execute legacy delete');

insert into auth.users (id,email) values
 ('91000000-0000-4000-8000-000000000001','planning-owner@test.local'),
 ('91000000-0000-4000-8000-000000000002','planning-admin@test.local'),
 ('91000000-0000-4000-8000-000000000003','planning-hr@test.local'),
 ('91000000-0000-4000-8000-000000000004','planning-member@test.local'),
 ('91000000-0000-4000-8000-000000000005','planning-foreign@test.local');
insert into public.companies(id,name,slug) values
 ('92000000-0000-4000-8000-000000000001','Planning Alpha','planning-alpha'),
 ('92000000-0000-4000-8000-000000000002','Planning Beta','planning-beta');
insert into public.company_members(company_id,user_id,role) values
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','owner'),
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','admin'),
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','hr'),
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000004','employee'),
 ('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000005','owner');

insert into public.organization_planning_workspaces(id,company_id) values
 ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001'),
 ('93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002');
insert into public.organization_planning_snapshots(id,company_id,workspace_id,version,published_at,organization,kind) values
 ('94000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001',1,'2026-01-01Z','{"tenant":"alpha"}','baseline'),
 ('94000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000002',1,'2026-01-01Z','{"tenant":"beta"}','baseline');
insert into public.organization_planning_scenarios(id,company_id,workspace_id,base_snapshot_id,name,status,version,branch_path) values
 ('95000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','Draft reject','draft',1,'95000000-0000-4000-8000-000000000001'),
 ('95000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','Stale reject','approved',2,'95000000-0000-4000-8000-000000000002'),
 ('95000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','Manifest reject','approved',1,'95000000-0000-4000-8000-000000000003'),
 ('95000000-0000-4000-8000-000000000004','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','Valid publish','approved',1,'95000000-0000-4000-8000-000000000004'),
 ('95000000-0000-4000-8000-000000000005','92000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000002','Foreign draft','draft',1,'95000000-0000-4000-8000-000000000005');
insert into public.organization_planning_change_sets(id,company_id,scenario_id,change_type,payload,version) values
 ('96000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000003','rename','{"name":"Manifest"}',1),
 ('96000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000004','rename','{"name":"Published"}',1),
 ('96000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000002','95000000-0000-4000-8000-000000000005','rename','{"name":"Foreign"}',1);

-- ACL and RLS are independent gates: client table access is closed, while the
-- policy predicates still resolve membership and tenant isolation against real rows.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select ok(public.is_company_member('92000000-0000-4000-8000-000000000001'),'member satisfies the authorized tenant RLS predicate');
select ok(not public.is_company_member('92000000-0000-4000-8000-000000000002'),'member fails the foreign tenant RLS predicate');
select throws_ok($$select count(*) from public.organization_planning_workspaces$$,'42501',null,'member direct read is closed by table ACL before RLS');
select throws_ok($$update public.organization_planning_workspaces set version=version+1$$,'42501',null,'member direct update is closed by table ACL');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select ok(not public.is_company_member('92000000-0000-4000-8000-000000000001'),'foreign actor fails the Alpha tenant RLS predicate');
select throws_ok($$select count(*) from public.organization_planning_scenarios$$,'42501',null,'foreign actor direct read is also closed by table ACL');
reset role;

-- Elevated actors satisfy the mutation policy predicate, but canonical table ACL
-- deliberately leaves no direct client mutation surface.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select ok(public.has_company_role('92000000-0000-4000-8000-000000000001',array['owner','admin','hr']),'owner satisfies the elevated RLS predicate');
select throws_ok($$update public.organization_planning_workspaces set updated_at='2026-01-02Z'$$,'42501',null,'owner direct mutation is closed by table ACL');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok(public.has_company_role('92000000-0000-4000-8000-000000000001',array['owner','admin','hr']),'admin satisfies the elevated RLS predicate');
select throws_ok($$insert into public.organization_planning_scenarios(id,company_id,workspace_id,base_snapshot_id,name,status,version,branch_path) values('95000000-0000-4000-8000-000000000006','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','Admin draft','draft',1,'95000000-0000-4000-8000-000000000006')$$,'42501',null,'admin direct mutation is closed by table ACL');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select ok(public.has_company_role('92000000-0000-4000-8000-000000000001',array['owner','admin','hr']),'hr satisfies the elevated RLS predicate');
select throws_ok($$insert into public.organization_planning_change_sets(id,company_id,scenario_id,change_type,payload,version) values('96000000-0000-4000-8000-000000000004','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','rename','{"name":"HR"}',1)$$,'42501',null,'hr direct mutation is closed by table ACL');
reset role;

-- Legacy delete exposure is closed before table authorization is considered.
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select throws_ok($$select public.delete_planning_scenario('92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',1)$$,'42501',null,'anon cannot EXECUTE legacy delete');
reset role;
select is((select count(*) from public.organization_planning_scenarios where id='95000000-0000-4000-8000-000000000001'),1::bigint,'anon delete attempt leaves the scenario intact');

-- Tenant-owned composite keys reject cross-tenant references at PostgreSQL.
select throws_ok($$insert into public.organization_planning_scenarios(id,company_id,workspace_id,base_snapshot_id,name,status,version,branch_path) values('95000000-0000-4000-8000-000000000090','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000001','Cross workspace','draft',1,'95000000-0000-4000-8000-000000000090')$$,'23503',null,'scenario rejects a foreign-tenant workspace');
select throws_ok($$insert into public.organization_planning_scenarios(id,company_id,workspace_id,base_snapshot_id,name,status,version,branch_path) values('95000000-0000-4000-8000-000000000091','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002','Cross baseline','draft',1,'95000000-0000-4000-8000-000000000091')$$,'23503',null,'scenario rejects a foreign-tenant base snapshot');
select throws_ok($$insert into public.organization_planning_change_sets(id,company_id,scenario_id,change_type,payload,version) values('96000000-0000-4000-8000-000000000090','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000005','rename','{}',1)$$,'23503',null,'change set rejects a foreign-tenant scenario');
select throws_ok($$insert into public.organization_planning_snapshots(id,company_id,workspace_id,source_scenario_id,version,published_at,organization,kind) values('94000000-0000-4000-8000-000000000090','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000005',2,'2026-01-03Z','{}','projection')$$,'23503',null,'snapshot rejects a foreign-tenant source scenario');

-- The invoker publication RPC is internal; its validation/atomicity contract
-- remains independently exercised as postgres.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.publish_planning_scenario('92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',1,'97000000-0000-4000-8000-000000000000','2026-02-01Z','{"state":"acl"}','[]')$$,'42501',null,'authenticated cannot EXECUTE legacy publish');
reset role;
select throws_ok($$select * from public.publish_planning_scenario('92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',1,'97000000-0000-4000-8000-000000000001','2026-02-01Z','{"state":"bad-status"}','[]')$$,'P0001','PLANNING_SCENARIO_MUST_BE_APPROVED','publish rejects a non-approved scenario');
select throws_ok($$select * from public.publish_planning_scenario('92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002',1,'97000000-0000-4000-8000-000000000002','2026-02-01Z','{"state":"stale"}','[]')$$,'P0001','PLANNING_VERSION_CONFLICT','publish rejects stale expected_version');
select throws_ok($$select * from public.publish_planning_scenario('92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000003',1,'97000000-0000-4000-8000-000000000003','2026-02-01Z','{"state":"manifest"}','[]')$$,'P0001','PLANNING_CHANGE_SETS_CONFLICT','publish rejects an incompatible change-set fingerprint');
select is((select count(*) from public.organization_planning_snapshots where id in ('97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000002','97000000-0000-4000-8000-000000000003')),0::bigint,'failed publishes leave no partial snapshot');
select is((select count(*) from public.organization_planning_scenarios where id in ('95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002','95000000-0000-4000-8000-000000000003') and status='published'),0::bigint,'failed publishes leave no scenario partially published');
select results_eq($$select id,version from public.organization_planning_scenarios where id in ('95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002','95000000-0000-4000-8000-000000000003') order by id$$,$$values ('95000000-0000-4000-8000-000000000001'::uuid,1),('95000000-0000-4000-8000-000000000002'::uuid,2),('95000000-0000-4000-8000-000000000003'::uuid,1)$$,'failed publishes leave canonical versions unchanged');

select results_eq($$select scenario_status,scenario_version,snapshot_id,snapshot_version,snapshot_organization from public.publish_planning_scenario('92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000004',1,'97000000-0000-4000-8000-000000000004','2026-02-01Z','{"state":"published"}',jsonb_build_array(jsonb_build_object('id','96000000-0000-4000-8000-000000000002','changeType','rename','payload',jsonb_build_object('name','Published'),'version',1)))$$,$$values ('published'::text,2,'97000000-0000-4000-8000-000000000004'::uuid,2,'{"state":"published"}'::jsonb)$$,'valid publish returns canonical scenario and snapshot readback');
select is((select status from public.organization_planning_scenarios where id='95000000-0000-4000-8000-000000000004'),'published','valid publish durably marks the scenario published');
select is((select version from public.organization_planning_scenarios where id='95000000-0000-4000-8000-000000000004'),2,'valid publish durably increments scenario version');
select is((select count(*) from public.organization_planning_snapshots where id='97000000-0000-4000-8000-000000000004' and source_scenario_id='95000000-0000-4000-8000-000000000004' and version=2 and kind='projection'),1::bigint,'valid publish atomically creates the canonical projection snapshot');

-- RLS blocks client snapshot mutation; the triggers independently protect all callers.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$update public.organization_planning_snapshots set published_at='2026-03-01Z'$$,'42501',null,'snapshot UPDATE is closed by table ACL for an owner');
select throws_ok($$delete from public.organization_planning_snapshots$$,'42501',null,'snapshot DELETE is closed by table ACL for an owner');
select throws_ok($$update public.organization_planning_scenarios set name='Changed'$$,'42501',null,'published scenario UPDATE is closed by table ACL for an owner');
select throws_ok($$delete from public.organization_planning_scenarios$$,'42501',null,'published scenario DELETE is closed by table ACL for an owner');
reset role;
select throws_ok($$update public.organization_planning_snapshots set published_at='2026-03-01Z' where id='94000000-0000-4000-8000-000000000001'$$,'P0001','PLANNING_SNAPSHOT_IS_IMMUTABLE','snapshot immutability trigger blocks UPDATE independently of RLS');
select throws_ok($$delete from public.organization_planning_snapshots where id='94000000-0000-4000-8000-000000000001'$$,'P0001','PLANNING_SNAPSHOT_IS_IMMUTABLE','snapshot immutability trigger blocks DELETE independently of RLS');
select throws_ok($$update public.organization_planning_scenarios set name='Changed' where id='95000000-0000-4000-8000-000000000004'$$,'P0001','PUBLISHED_PLANNING_SCENARIO_IS_IMMUTABLE','published scenario immutability trigger blocks UPDATE independently of ACL');
select throws_ok($$delete from public.organization_planning_scenarios where id='95000000-0000-4000-8000-000000000004'$$,'P0001','PUBLISHED_PLANNING_SCENARIO_IS_IMMUTABLE','published scenario immutability trigger blocks DELETE independently of ACL');

select * from finish();
rollback;
