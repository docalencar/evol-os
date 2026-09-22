begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

select has_function('public','create_planning_change_set_v1',array['uuid','integer','uuid','text','jsonb']);
select has_function('public','replace_planning_change_set_v1',array['uuid','integer','uuid','uuid','text','jsonb']);
select has_function('public','remove_planning_change_set_v1',array['uuid','integer','uuid']);
select has_function('public','reorder_planning_change_sets_v1',array['uuid','integer','uuid[]']);
select ok((select bool_and(p.prosecdef and p.proconfig=array['search_path=public, pg_temp'])
  from pg_proc p where p.oid in (
    'public.create_planning_change_set_v1(uuid,integer,uuid,text,jsonb)'::regprocedure,
    'public.replace_planning_change_set_v1(uuid,integer,uuid,uuid,text,jsonb)'::regprocedure,
    'public.remove_planning_change_set_v1(uuid,integer,uuid)'::regprocedure,
    'public.reorder_planning_change_sets_v1(uuid,integer,uuid[])'::regprocedure
  )),'change-set mutations are SECURITY DEFINER with fixed search_path');
select ok((select bool_and(has_function_privilege('authenticated',oid,'execute')) from unnest(array[
  'public.create_planning_change_set_v1(uuid,integer,uuid,text,jsonb)'::regprocedure,
  'public.replace_planning_change_set_v1(uuid,integer,uuid,uuid,text,jsonb)'::regprocedure,
  'public.remove_planning_change_set_v1(uuid,integer,uuid)'::regprocedure,
  'public.reorder_planning_change_sets_v1(uuid,integer,uuid[])'::regprocedure
]) oid),'authenticated can execute change-set mutations');
select ok((select bool_and(not has_function_privilege(role,oid,'execute'))
  from unnest(array['public','anon']) role, unnest(array[
    'public.create_planning_change_set_v1(uuid,integer,uuid,text,jsonb)'::regprocedure,
    'public.replace_planning_change_set_v1(uuid,integer,uuid,uuid,text,jsonb)'::regprocedure,
    'public.remove_planning_change_set_v1(uuid,integer,uuid)'::regprocedure,
    'public.reorder_planning_change_sets_v1(uuid,integer,uuid[])'::regprocedure
  ]) oid),'PUBLIC and anon cannot execute change-set mutations');
select ok((select bool_and(not has_table_privilege(role,t,p))
  from unnest(array['public','anon','authenticated']) role,
  unnest(array['public.organization_planning_workspaces','public.organization_planning_scenarios',
    'public.organization_planning_snapshots','public.organization_planning_change_sets']) t,
  unnest(array['select','insert','update','delete']) p),'direct Planning table ACL stays closed');
select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.organization_planning_workspaces'::regclass,'public.organization_planning_scenarios'::regclass,
  'public.organization_planning_snapshots'::regclass,'public.organization_planning_change_sets'::regclass
)),'Planning RLS stays enabled');

insert into auth.users(id,email) values
 ('c1000000-0000-4000-8000-000000000001','p5a-owner@test.local'),
 ('c1000000-0000-4000-8000-000000000002','p5a-admin@test.local'),
 ('c1000000-0000-4000-8000-000000000003','p5a-hr@test.local'),
 ('c1000000-0000-4000-8000-000000000004','p5a-manager@test.local'),
 ('c1000000-0000-4000-8000-000000000005','p5a-employee@test.local'),
 ('c1000000-0000-4000-8000-000000000006','p5a-foreign@test.local');
insert into public.companies(id,name,slug) values
 ('c2000000-0000-4000-8000-000000000001','P5A Alpha','p5a-alpha'),
 ('c2000000-0000-4000-8000-000000000002','P5A Beta','p5a-beta');
insert into public.company_members(company_id,user_id,role,status) values
 ('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','owner','active'),
 ('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','admin','active'),
 ('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000003','hr','active'),
 ('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000004','manager','active'),
 ('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000005','employee','active'),
 ('c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000006','owner','active');
insert into public.organization_planning_workspaces(id,company_id) values
 ('c3000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001'),
 ('c3000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002');
insert into public.organization_planning_snapshots(id,company_id,workspace_id,version,published_at,organization,kind) values
 ('c4000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001',1,now(),'{}','baseline'),
 ('c4000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000002',1,now(),'{}','baseline');
insert into public.organization_planning_scenarios(id,company_id,workspace_id,base_snapshot_id,name,status,version,branch_path) values
 ('c5000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','Owner draft','draft',1,'c5000000-0000-4000-8000-000000000001'),
 ('c5000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','Admin draft','draft',1,'c5000000-0000-4000-8000-000000000002'),
 ('c5000000-0000-4000-8000-000000000003','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','HR draft','draft',1,'c5000000-0000-4000-8000-000000000003'),
 ('c5000000-0000-4000-8000-000000000004','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','Submitted','submitted',1,'c5000000-0000-4000-8000-000000000004'),
 ('c5000000-0000-4000-8000-000000000005','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','Rejected','rejected',1,'c5000000-0000-4000-8000-000000000005'),
 ('c5000000-0000-4000-8000-000000000006','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','Approved','approved',1,'c5000000-0000-4000-8000-000000000006'),
 ('c5000000-0000-4000-8000-000000000007','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','Published','published',1,'c5000000-0000-4000-8000-000000000007'),
 ('c5000000-0000-4000-8000-000000000008','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','Ordering','draft',1,'c5000000-0000-4000-8000-000000000008'),
 ('c5000000-0000-4000-8000-000000000009','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','Concurrency','draft',1,'c5000000-0000-4000-8000-000000000009'),
 ('c5000000-0000-4000-8000-000000000010','c2000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000002','c4000000-0000-4000-8000-000000000002','Foreign draft','draft',1,'c5000000-0000-4000-8000-000000000010');
insert into public.organization_planning_change_sets(id,company_id,scenario_id,change_type,payload,version) values
 ('c6000000-0000-4000-8000-000000000004','c2000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000004','department.create','{"department":{"id":"submitted"}}',1),
 ('c6000000-0000-4000-8000-000000000005','c2000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000005','department.create','{"department":{"id":"rejected"}}',1),
 ('c6000000-0000-4000-8000-000000000006','c2000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000006','department.create','{"department":{"id":"approved"}}',1),
 ('c6000000-0000-4000-8000-000000000007','c2000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000007','department.create','{"department":{"id":"published"}}',1),
 ('c6000000-0000-4000-8000-000000000081','c2000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000008','department.create','{"department":{"id":"one"}}',1),
 ('c6000000-0000-4000-8000-000000000082','c2000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000008','team.create','{"team":{"id":"two"}}',2),
 ('c6000000-0000-4000-8000-000000000083','c2000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000008','position.create','{"position":{"id":"three"}}',3);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',1,'c6000000-0000-4000-8000-000000000091','department.create','{}')$$,'P0002','PLANNING_RESOURCE_UNAVAILABLE','manager remains read-only');
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',1,'c6000000-0000-4000-8000-000000000092','department.create','{}')$$,'P0002','PLANNING_RESOURCE_UNAVAILABLE','employee remains read-only');
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',1,'c6000000-0000-4000-8000-000000000093','department.create','{}')$$,'P0002','PLANNING_RESOURCE_UNAVAILABLE','foreign owner cannot mutate another tenant');

select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',null,'c6000000-0000-4000-8000-000000000094','department.create','{}')$$,'22023','PLANNING_EXPECTED_VERSION_INVALID','expected_version is mandatory');
select throws_ok($$select public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',1,'c6000000-0000-4000-8000-000000000095','unknown.change','{}')$$,'22023','PLANNING_CHANGE_SET_INPUT_INVALID','unsupported change type is rejected');
select is(public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',1,'c6000000-0000-4000-8000-000000000001','department.create','{"department":{"id":"alpha","name":"Alpha"}}')->'scenario'->>'version','2','owner create increments and returns scenario version');
select is((select version from public.get_planning_change_sets_v1('c5000000-0000-4000-8000-000000000001') where id='c6000000-0000-4000-8000-000000000001'),1,'create is canonically readable in projection order');
select throws_ok($$select public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',1,'c6000000-0000-4000-8000-000000000096','team.create','{}')$$,'40001','PLANNING_VERSION_CONFLICT','stale create is rejected');

select is(public.replace_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',2,'c6000000-0000-4000-8000-000000000001','c6000000-0000-4000-8000-000000000002','department.update','{"department":{"id":"alpha","name":"Alpha 2"}}')->'scenario'->>'version','3','replace increments and returns scenario version');
reset role;
select is((select superseded_by from public.organization_planning_change_sets where id='c6000000-0000-4000-8000-000000000001'),'c6000000-0000-4000-8000-000000000002'::uuid,'replace preserves supersession lineage');
select ok((select not active and archived_at is not null from public.organization_planning_change_sets where id='c6000000-0000-4000-8000-000000000001'),'superseded change set remains as inactive history');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select id from public.get_planning_change_sets_v1('c5000000-0000-4000-8000-000000000001')),'c6000000-0000-4000-8000-000000000002'::uuid,'canonical readback exposes only active replacement');
select throws_ok($$select public.replace_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',2,'c6000000-0000-4000-8000-000000000002','c6000000-0000-4000-8000-000000000097','department.update','{}')$$,'40001','PLANNING_VERSION_CONFLICT','stale replace is rejected atomically');

select is(public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',3,'c6000000-0000-4000-8000-000000000003','team.create','{"team":{"id":"beta"}}')->'changeSet'->>'version','2','create appends deterministic projection order');
select is(public.remove_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',4,'c6000000-0000-4000-8000-000000000002')->'scenario'->>'version','5','remove increments and returns scenario version');
reset role;
select ok((select not active and archived_at is not null from public.organization_planning_change_sets where id='c6000000-0000-4000-8000-000000000002'),'remove archives instead of deleting history');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_planning_change_sets_v1('c5000000-0000-4000-8000-000000000001')),1::bigint,'remove canonical readback omits archived history');
select throws_ok($$select public.remove_planning_change_set_v1('c5000000-0000-4000-8000-000000000001',4,'c6000000-0000-4000-8000-000000000003')$$,'40001','PLANNING_VERSION_CONFLICT','stale remove leaves active content unchanged');

select is(public.reorder_planning_change_sets_v1('c5000000-0000-4000-8000-000000000008',1,array['c6000000-0000-4000-8000-000000000083','c6000000-0000-4000-8000-000000000081','c6000000-0000-4000-8000-000000000082']::uuid[])->'scenario'->>'version','2','reorder increments and returns scenario version');
select results_eq($$select id from public.get_planning_change_sets_v1('c5000000-0000-4000-8000-000000000008') order by version,id$$,$$values
 ('c6000000-0000-4000-8000-000000000083'::uuid),('c6000000-0000-4000-8000-000000000081'::uuid),('c6000000-0000-4000-8000-000000000082'::uuid)$$,'reorder persists canonical deterministic projection order');
select throws_ok($$select public.reorder_planning_change_sets_v1('c5000000-0000-4000-8000-000000000008',2,array['c6000000-0000-4000-8000-000000000083','c6000000-0000-4000-8000-000000000083','c6000000-0000-4000-8000-000000000082']::uuid[])$$,'22023','PLANNING_CHANGE_SET_ORDER_INVALID','duplicate reorder input is rejected');
select throws_ok($$select public.reorder_planning_change_sets_v1('c5000000-0000-4000-8000-000000000008',1,array['c6000000-0000-4000-8000-000000000081','c6000000-0000-4000-8000-000000000082','c6000000-0000-4000-8000-000000000083']::uuid[])$$,'40001','PLANNING_VERSION_CONFLICT','stale reorder is rejected before mutation');

select is(public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000009',1,'c6000000-0000-4000-8000-000000000009','vacancy.create','{"vacancy":{"id":"v1"}}')->'scenario'->>'version','2','first logical concurrent writer succeeds');
select throws_ok($$select public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000009',1,'c6000000-0000-4000-8000-000000000010','vacancy.create','{}')$$,'40001','PLANNING_VERSION_CONFLICT','second logical concurrent writer loses on expected_version');

select throws_ok($$select public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000004',1,'c6000000-0000-4000-8000-000000000014','team.create','{}')$$,'55000','PLANNING_CONTENT_REQUIRES_DRAFT','submitted content is locked');
select throws_ok($$select public.replace_planning_change_set_v1('c5000000-0000-4000-8000-000000000005',1,'c6000000-0000-4000-8000-000000000005','c6000000-0000-4000-8000-000000000015','department.update','{}')$$,'55000','PLANNING_CONTENT_REQUIRES_DRAFT','rejected content is locked until lifecycle revise');
select throws_ok($$select public.remove_planning_change_set_v1('c5000000-0000-4000-8000-000000000006',1,'c6000000-0000-4000-8000-000000000006')$$,'55000','PLANNING_CONTENT_REQUIRES_DRAFT','approved content is locked');
select throws_ok($$select public.reorder_planning_change_sets_v1('c5000000-0000-4000-8000-000000000007',1,array['c6000000-0000-4000-8000-000000000007']::uuid[])$$,'55000','PLANNING_CONTENT_REQUIRES_DRAFT','published content is terminal and locked');

select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000002',1,'c6000000-0000-4000-8000-000000000021','team.create','{"team":{"id":"admin"}}')->'scenario'->>'version','2','admin may mutate draft content');
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is(public.create_planning_change_set_v1('c5000000-0000-4000-8000-000000000003',1,'c6000000-0000-4000-8000-000000000031','position.create','{"position":{"id":"hr"}}')->'scenario'->>'version','2','hr may mutate draft content');
reset role;

select is((select version from public.organization_planning_scenarios where id='c5000000-0000-4000-8000-000000000001'),5,'failed owner mutations leave scenario version unchanged');
select is((select count(*) from public.organization_planning_change_sets where id in ('c6000000-0000-4000-8000-000000000095','c6000000-0000-4000-8000-000000000096','c6000000-0000-4000-8000-000000000097')),0::bigint,'validation and stale failures leave no partial change sets');
select is((select version from public.organization_planning_scenarios where id='c5000000-0000-4000-8000-000000000008'),2,'failed reorder leaves scenario version unchanged');
select results_eq($$select version from public.organization_planning_change_sets where scenario_id='c5000000-0000-4000-8000-000000000008' order by version$$,$$values (1),(2),(3)$$,'failed reorders leave persisted ordering unchanged');
select is((select version from public.organization_planning_scenarios where id='c5000000-0000-4000-8000-000000000009'),2,'stale logical writer leaves scenario version unchanged');
select is((select count(*) from public.organization_planning_change_sets where scenario_id='c5000000-0000-4000-8000-000000000009'),1::bigint,'stale logical writer leaves no partial content');
select is((select count(*) from public.organization_planning_change_sets where id in ('c6000000-0000-4000-8000-000000000014','c6000000-0000-4000-8000-000000000015')),0::bigint,'non-draft failures leave no partial content');
select ok((select active from public.organization_planning_change_sets where id='c6000000-0000-4000-8000-000000000006'),'failed approved remove leaves content active');
select is((select version from public.organization_planning_scenarios where id='c5000000-0000-4000-8000-000000000007'),1,'published scenario remains unchanged');

select * from finish();
rollback;
