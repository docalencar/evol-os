begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Schema.
-- ---------------------------------------------------------------------------
select has_table('public','seniority_levels','seniority_levels table exists');
select has_column('public','seniority_levels','id','id column');
select has_column('public','seniority_levels','company_id','company_id column');
select has_column('public','seniority_levels','code','code column');
select has_column('public','seniority_levels','label','label column');
select has_column('public','seniority_levels','rank','rank column');
select has_column('public','seniority_levels','active','active column');
select col_type_is('public','seniority_levels','rank','integer','rank is integer');
select col_type_is('public','seniority_levels','active','boolean','active is boolean');
select ok((select relrowsecurity from pg_class where oid='public.seniority_levels'::regclass),
  'RLS is enabled on seniority_levels');
select has_index('public','seniority_levels','seniority_levels_company_code_active_unique',
  'active-code partial unique index exists');
select ok(exists(select 1 from pg_constraint where conname='seniority_levels_id_company_id_key'),
  'composite tenant-safe key (id, company_id) exists');

-- No unsafe table grants: writes and reads stay closed for authenticated.
select ok(not has_table_privilege('authenticated','public.seniority_levels','insert'),'insert stays closed');
select ok(not has_table_privilege('authenticated','public.seniority_levels','update'),'update stays closed');
select ok(not has_table_privilege('authenticated','public.seniority_levels','delete'),'delete stays closed');
select ok(not has_table_privilege('authenticated','public.seniority_levels','select'),'select stays closed (read boundary comes in 1B)');

-- ---------------------------------------------------------------------------
-- Function contract.
-- ---------------------------------------------------------------------------
select has_function('public','create_tenant_seniority_level_v1',array['uuid','text','text','integer','text']);
select has_function('public','update_tenant_seniority_level_v1',array['uuid','uuid','text','text','integer']);
select has_function('public','archive_tenant_seniority_level_v1',array['uuid','uuid']);

select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('create_tenant_seniority_level_v1','update_tenant_seniority_level_v1','archive_tenant_seniority_level_v1')
    and p.prosecdef and p.proconfig=array['search_path=public, pg_temp']
),3::bigint,'all seniority boundaries are SECURITY DEFINER with hardened search_path');
select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('create_tenant_seniority_level_v1','update_tenant_seniority_level_v1','archive_tenant_seniority_level_v1')
    and has_function_privilege('authenticated',p.oid,'execute')
),3::bigint,'authenticated may execute all three boundaries');
select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('create_tenant_seniority_level_v1','update_tenant_seniority_level_v1','archive_tenant_seniority_level_v1')
    and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute'))
),0::bigint,'anon and service_role cannot execute any boundary');

-- ---------------------------------------------------------------------------
-- Fixtures: Alpha (owner/manager/employee), Beta (owner-b). A Beta level exists.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('a0000000-0000-4000-8000-000000000004','manager-a@example.com'),
  ('a0000000-0000-4000-8000-000000000005','employee-a@example.com'),
  ('a0000000-0000-4000-8000-000000000008','owner-b@example.com');
insert into public.companies (id, name, slug) values
  ('a0000000-0000-4000-8000-000000000101','Sen Alpha','sen-alpha'),
  ('a0000000-0000-4000-8000-000000000102','Sen Beta','sen-beta');
insert into public.company_members (id, company_id, user_id, role, status) values
  ('a0000000-0000-4000-8000-000000000111','a0000000-0000-4000-8000-000000000101','a0000000-0000-4000-8000-000000000001','owner','active'),
  ('a0000000-0000-4000-8000-000000000114','a0000000-0000-4000-8000-000000000101','a0000000-0000-4000-8000-000000000004','manager','active'),
  ('a0000000-0000-4000-8000-000000000115','a0000000-0000-4000-8000-000000000101','a0000000-0000-4000-8000-000000000005','employee','active'),
  ('a0000000-0000-4000-8000-000000000118','a0000000-0000-4000-8000-000000000102','a0000000-0000-4000-8000-000000000008','owner','active');
insert into public.seniority_levels (id, company_id, code, label, rank) values
  ('a0000000-0000-4000-8000-0000000006ff','a0000000-0000-4000-8000-000000000102','BSR','Beta Sênior',1);

-- No required seed: Alpha has zero seniority levels after the migration.
select is((select count(*)::int from public.seniority_levels where company_id='a0000000-0000-4000-8000-000000000101'),
  0,'a company can exist with zero seniority levels (no required seed)');

-- Captured ids of levels created through the boundary (authenticated cannot SELECT).
create temporary table t_ids(name text, id uuid) on commit drop;
grant select, insert on t_ids to authenticated;

-- ---------------------------------------------------------------------------
-- Denials: manager, employee, unauthenticated.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','X','X',1,'k')$$,
  '42501','AUTHENTICATION_REQUIRED','unauthenticated create denied');
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','X','X',1,'k')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','manager cannot create');
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.archive_tenant_seniority_level_v1('a0000000-0000-4000-8000-0000000006ff','a0000000-0000-4000-8000-0000000006ff')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','employee cannot archive');
reset role;

-- ---------------------------------------------------------------------------
-- Behavioral, as the active Alpha owner.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- CREATE validation.
select throws_ok($$select public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','','Vazio',1,'k1')$$,
  '22023','VALIDATION_FAILED','empty code rejected');
select throws_ok($$select public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','JR','',1,'k2')$$,
  '22023','VALIDATION_FAILED','empty label rejected');
select throws_ok($$select public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','JR','Júnior',-1,'k3')$$,
  '22023','VALIDATION_FAILED','negative rank rejected');
select throws_ok($$select public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','JR','Júnior',1,'')$$,
  '22023','VALIDATION_FAILED','empty idempotency key rejected');

-- CREATE happy path (capture ids).
insert into t_ids values ('junior',
  ((public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','JUNIOR','Júnior',1,'jr-1')) ->> 'seniorityLevelId')::uuid);
insert into t_ids values ('pleno',
  ((public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','PLENO','Pleno',2,'pl-1')) ->> 'seniorityLevelId')::uuid);
select ok((select id from t_ids where name='junior') is not null,'owner creates a seniority level');

-- Idempotent retry (same key + same intent).
select is((public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','JUNIOR','Júnior',1,'jr-1')) ->> 'status',
  'idempotent_retry','same key + same intent is an idempotent retry');
-- Same key + different intent conflicts.
select throws_ok($$select public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','JUNIOR X','Júnior',1,'jr-1')$$,
  '23505','IDEMPOTENCY_CONFLICT','same key + different intent rejected');
-- Duplicate active code (case-insensitive) conflicts.
select throws_ok($$select public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','junior','Júnior',1,'dup-1')$$,
  '23505','CONFLICT','duplicate active code rejected');
-- Cross-tenant create denied at the gate.
select throws_ok($$select public.create_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000102','INTRUSO','Intruso',1,'x-1')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','owner cannot create in a foreign tenant');

-- UPDATE happy path.
select is((public.update_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101',(select id from t_ids where name='pleno'),'PLENO','Pleno II',3)) ->> 'status',
  'succeeded','owner updates a seniority level');
-- UPDATE fail-closed: cross-tenant, nonexistent, invalid, uniqueness.
select throws_ok($$select public.update_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','a0000000-0000-4000-8000-0000000006ff','X','X',1)$$,
  'P0002','SENIORITY_LEVEL_NOT_FOUND','cannot update a foreign-tenant level');
select throws_ok($$select public.update_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','a0000000-0000-4000-8000-0000000006aa','X','X',1)$$,
  'P0002','SENIORITY_LEVEL_NOT_FOUND','cannot update a nonexistent level');
select throws_ok(format($$select public.update_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','%s','X','X',-1)$$,(select id from t_ids where name='pleno')),
  '22023','VALIDATION_FAILED','update with negative rank rejected');
-- Rename PLENO's code to JUNIOR (an active code) conflicts.
select throws_ok(format($$select public.update_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','%s','JUNIOR','Pleno',3)$$,(select id from t_ids where name='pleno')),
  '23505','CONFLICT','renaming to an existing active code rejected');

-- ARCHIVE happy path + idempotent + fail-closed.
select is((public.archive_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101',(select id from t_ids where name='pleno'))) ->> 'status',
  'succeeded','owner archives a seniority level');
select is((public.archive_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101',(select id from t_ids where name='pleno'))) ->> 'status',
  'already_archived','double archive is idempotent');
-- An archived level cannot be updated.
select throws_ok(format($$select public.update_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','%s','PLENO','Pleno',2)$$,(select id from t_ids where name='pleno')),
  'P0002','SENIORITY_LEVEL_NOT_FOUND','cannot update an archived level');
select throws_ok($$select public.archive_tenant_seniority_level_v1('a0000000-0000-4000-8000-000000000101','a0000000-0000-4000-8000-0000000006ff')$$,
  'P0002','SENIORITY_LEVEL_NOT_FOUND','cannot archive a foreign-tenant level');
reset role;

-- ---------------------------------------------------------------------------
-- Side effects (setup role bypasses RLS/grants).
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.seniority_levels
   where company_id='a0000000-0000-4000-8000-000000000101' and code='JUNIOR' and active=true),
  1,'the created active level persists');
select is((select active from public.seniority_levels where id=(select id from t_ids where name='pleno')),
  false,'the archived level is inactive');
select ok((select exists(select 1 from public.seniority_levels where id=(select id from t_ids where name='pleno'))),
  'the archived level row still exists (historical)');
select is((select company_id from public.seniority_levels where id=(select id from t_ids where name='pleno')),
  'a0000000-0000-4000-8000-000000000101','company_id is immutable across update');
select is((select count(*)::int from public.activity_events
   where company_id='a0000000-0000-4000-8000-000000000101' and activity_type='seniority_level.created'),
  2,'two create activities were recorded');
select is((select count(*)::int from public.activity_events
   where company_id='a0000000-0000-4000-8000-000000000101' and activity_type='seniority_level.updated'),
  1,'one update activity was recorded');
select is((select count(*)::int from public.activity_events
   where company_id='a0000000-0000-4000-8000-000000000101' and activity_type='seniority_level.archived'),
  1,'one archive activity was recorded');

select * from finish();
rollback;
