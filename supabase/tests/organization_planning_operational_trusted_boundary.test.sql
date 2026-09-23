begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

select has_function('public','get_planning_workspaces_v1',array['uuid']);
select has_function('public','get_planning_scenarios_v1',array['uuid']);
select has_function('public','get_planning_snapshots_v1',array['uuid']);
select has_function('public','get_planning_change_sets_v1',array['uuid']);
select has_function('public','bootstrap_planning_workspace_v1',array['uuid','uuid','uuid','jsonb']);
select has_function('public','create_planning_scenario_v1',array['uuid','uuid','uuid','text','text']);
select has_function('public','create_planning_scenario_branch_v1',array['uuid','integer','uuid']);
select has_function('public','rename_planning_scenario_v1',array['uuid','integer','text']);
select has_function('public','delete_planning_scenario_v1',array['uuid','integer']);

select ok((select bool_and(p.prosecdef and p.proconfig=array['search_path=public, pg_temp'])
  from pg_proc p where p.oid in (
    'public.get_planning_workspaces_v1(uuid)'::regprocedure,
    'public.get_planning_scenarios_v1(uuid)'::regprocedure,
    'public.get_planning_snapshots_v1(uuid)'::regprocedure,
    'public.get_planning_change_sets_v1(uuid)'::regprocedure,
    'public.bootstrap_planning_workspace_v1(uuid,uuid,uuid,jsonb)'::regprocedure,
    'public.create_planning_scenario_v1(uuid,uuid,uuid,text,text)'::regprocedure,
    'public.create_planning_scenario_branch_v1(uuid,integer,uuid)'::regprocedure,
    'public.rename_planning_scenario_v1(uuid,integer,text)'::regprocedure,
    'public.delete_planning_scenario_v1(uuid,integer)'::regprocedure
  )),'operational boundaries are SECURITY DEFINER with fixed search_path');
select ok((select bool_and(has_function_privilege('authenticated',oid,'execute')) from unnest(array[
  'public.get_planning_workspaces_v1(uuid)'::regprocedure,
  'public.get_planning_scenarios_v1(uuid)'::regprocedure,
  'public.get_planning_snapshots_v1(uuid)'::regprocedure,
  'public.get_planning_change_sets_v1(uuid)'::regprocedure,
  'public.bootstrap_planning_workspace_v1(uuid,uuid,uuid,jsonb)'::regprocedure,
  'public.create_planning_scenario_v1(uuid,uuid,uuid,text,text)'::regprocedure,
  'public.create_planning_scenario_branch_v1(uuid,integer,uuid)'::regprocedure,
  'public.rename_planning_scenario_v1(uuid,integer,text)'::regprocedure,
  'public.delete_planning_scenario_v1(uuid,integer)'::regprocedure
]) oid),'authenticated can execute operational boundaries');
select ok((select bool_and(not has_function_privilege(role,oid,'execute'))
  from unnest(array['public','anon']) role,unnest(array[
    'public.get_planning_workspaces_v1(uuid)'::regprocedure,
    'public.get_planning_scenarios_v1(uuid)'::regprocedure,
    'public.get_planning_snapshots_v1(uuid)'::regprocedure,
    'public.get_planning_change_sets_v1(uuid)'::regprocedure,
    'public.bootstrap_planning_workspace_v1(uuid,uuid,uuid,jsonb)'::regprocedure,
    'public.create_planning_scenario_v1(uuid,uuid,uuid,text,text)'::regprocedure,
    'public.create_planning_scenario_branch_v1(uuid,integer,uuid)'::regprocedure,
    'public.rename_planning_scenario_v1(uuid,integer,text)'::regprocedure,
    'public.delete_planning_scenario_v1(uuid,integer)'::regprocedure
  ]) oid),'PUBLIC and anon cannot execute operational boundaries');
select ok((select bool_and(not has_table_privilege(role,t,p))
  from unnest(array['public','anon','authenticated']) role,
  unnest(array['public.organization_planning_workspaces','public.organization_planning_scenarios',
    'public.organization_planning_snapshots','public.organization_planning_change_sets']) t,
  unnest(array['select','insert','update','delete']) p),'direct Planning table ACL stays closed');
select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.organization_planning_workspaces'::regclass,'public.organization_planning_scenarios'::regclass,
  'public.organization_planning_snapshots'::regclass,'public.organization_planning_change_sets'::regclass
)),'Planning RLS stays enabled');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('archive_planning_scenario_v1','restore_planning_scenario_v1')),0::bigint,
  'archive and restore do not form a parallel lifecycle boundary');

insert into auth.users(id,email) values
 ('b1000000-0000-4000-8000-000000000001','db2-owner@test.local'),
 ('b1000000-0000-4000-8000-000000000002','db2-manager@test.local'),
 ('b1000000-0000-4000-8000-000000000003','db2-foreign@test.local'),
 ('b1000000-0000-4000-8000-000000000004','db2-admin@test.local'),
 ('b1000000-0000-4000-8000-000000000005','db2-hr@test.local');
insert into public.companies(id,name,slug) values
 ('b2000000-0000-4000-8000-000000000001','DB2 Alpha','db2-alpha'),
 ('b2000000-0000-4000-8000-000000000002','DB2 Beta','db2-beta'),
 ('b2000000-0000-4000-8000-000000000003','DB2 Bootstrap','db2-bootstrap');
insert into public.company_members(company_id,user_id,role,status) values
 ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','owner','active'),
 ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','manager','active'),
 ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000005','hr','active'),
 ('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000003','owner','active'),
 ('b2000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000004','admin','active');
insert into public.organization_planning_workspaces(id,company_id) values
 ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001'),
 ('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002');
insert into public.organization_planning_snapshots(id,company_id,workspace_id,version,published_at,organization,kind) values
 ('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001',1,now(),'{"tenant":"alpha"}','baseline'),
 ('b4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000002',1,now(),'{"tenant":"beta"}','baseline');
insert into public.organization_planning_scenarios(id,company_id,workspace_id,base_snapshot_id,name,status,version,branch_path) values
 ('b5000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','Alpha draft','draft',1,'b5000000-0000-4000-8000-000000000001'),
 ('b5000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000002','Beta draft','draft',1,'b5000000-0000-4000-8000-000000000002'),
 ('b5000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','Delete me','draft',1,'b5000000-0000-4000-8000-000000000003'),
 ('b5000000-0000-4000-8000-000000000007','b2000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','HR rename','draft',1,'b5000000-0000-4000-8000-000000000007');
insert into public.organization_planning_change_sets(id,company_id,scenario_id,change_type,payload,version) values
 ('b6000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','rename','{"name":"Future"}',1);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.get_planning_workspaces_v1('b2000000-0000-4000-8000-000000000001')),1::bigint,'manager reads authorized workspace');
select is((select count(*) from public.get_planning_scenarios_v1('b2000000-0000-4000-8000-000000000001')),3::bigint,'manager reads authorized scenarios');
select is((select count(*) from public.get_planning_snapshots_v1('b2000000-0000-4000-8000-000000000001')),1::bigint,'manager reads projection inputs');
select is((select count(*) from public.get_planning_change_sets_v1('b5000000-0000-4000-8000-000000000001')),1::bigint,'manager reads canonical publishable change sets');
select throws_ok($$select public.rename_planning_scenario_v1('b5000000-0000-4000-8000-000000000001',1,'Manager rename')$$,'P0002','PLANNING_RESOURCE_UNAVAILABLE','manager remains read-only');

select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*) from public.get_planning_scenarios_v1('b2000000-0000-4000-8000-000000000001')),0::bigint,'foreign actor reads zero scenarios');
select is((select count(*) from public.get_planning_change_sets_v1('b5000000-0000-4000-8000-000000000001')),0::bigint,'foreign actor reads zero change sets');

select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.create_planning_scenario_v1('b3000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000004','New scenario',null)->>'status','draft','owner creates canonical draft');
select is(public.create_planning_scenario_branch_v1('b5000000-0000-4000-8000-000000000001',1,'b5000000-0000-4000-8000-000000000005')->>'parent_scenario_id','b5000000-0000-4000-8000-000000000001','owner creates canonical branch');
select throws_ok($$select public.create_planning_scenario_branch_v1('b5000000-0000-4000-8000-000000000001',9,'b5000000-0000-4000-8000-000000000006')$$,'P0001','PLANNING_VERSION_CONFLICT','stale branch source is rejected');
select is(public.rename_planning_scenario_v1('b5000000-0000-4000-8000-000000000004',1,'Renamed scenario')->>'version','2','rename returns persisted incremented version');
select throws_ok($$select public.rename_planning_scenario_v1('b5000000-0000-4000-8000-000000000004',1,'Stale rename')$$,'P0001','PLANNING_VERSION_CONFLICT','stale rename is rejected');
select is(public.delete_planning_scenario_v1('b5000000-0000-4000-8000-000000000003',1)->>'deleted','true','draft delete returns canonical result');
select is((select count(*) from public.get_planning_scenarios_v1('b2000000-0000-4000-8000-000000000001') where id='b5000000-0000-4000-8000-000000000003'),0::bigint,'deleted draft is absent from canonical readback');
reset role;
select is((select name from public.organization_planning_scenarios where id='b5000000-0000-4000-8000-000000000004'),'Renamed scenario','stale rename leaves durable state unchanged');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select is(public.rename_planning_scenario_v1('b5000000-0000-4000-8000-000000000007',1,'HR canonical rename')->>'name','HR canonical rename','hr may use trusted mutation boundary');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is(public.bootstrap_planning_workspace_v1('b2000000-0000-4000-8000-000000000003','b3000000-0000-4000-8000-000000000003','b4000000-0000-4000-8000-000000000003','{"tenant":"bootstrap"}')->'workspace'->>'company_id','b2000000-0000-4000-8000-000000000003','admin bootstraps workspace with canonical readback');
select is((select count(*) from public.get_planning_snapshots_v1('b2000000-0000-4000-8000-000000000003') where kind='baseline'),1::bigint,'bootstrap atomically creates readable baseline');
reset role;

select ok((select bool_and(not has_function_privilege(role,oid,'execute')) from unnest(array['public','anon','authenticated']) role,unnest(array[
  'public.bootstrap_planning_workspace(uuid,uuid,uuid,timestamp with time zone,jsonb)'::regprocedure,
  'public.publish_planning_scenario(uuid,uuid,integer,uuid,timestamp with time zone,jsonb,jsonb)'::regprocedure,
  'public.delete_planning_scenario(uuid,uuid,integer)'::regprocedure
]) oid),'legacy RPCs remain closed');
select ok(has_function_privilege('authenticated','public.publish_planning_scenario_v1(uuid,integer,uuid,jsonb,jsonb)','execute'),'publication remains exclusively available through trusted v1');
select ok(not has_function_privilege('anon','public.publish_planning_scenario_v1(uuid,integer,uuid,jsonb,jsonb)','execute'),'anon cannot publish');

select * from finish();
rollback;
