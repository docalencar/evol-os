-- D-SEC1 — the Development application ledger is internal evidence.
--
-- Two halves, and both matter. CLOSURE: no client role reaches these tables
-- directly, including the actors who are entitled to the underlying plan — the
-- point is that entitlement is exercised through a purpose-bound boundary, not a
-- table privilege. CONTINUITY: everything that legitimately depended on this data
-- still works, because every consumer was already going through SECURITY DEFINER.
--
-- The second half is what makes the first half safe to assert.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- CLOSURE — table privilege
-- ---------------------------------------------------------------------------
-- Every client role against every ledger relation, every DML privilege. One
-- assertion, no gaps: a future migration that re-grants any of them fails here.
select is(
  (select count(*)::int
   from unnest(array['public','anon','authenticated','service_role']) r,
        unnest(array['development_template_applications',
                     'development_template_application_attempts',
                     'development_template_application_snapshots',
                     'development_template_application_lineage']) t,
        unnest(array['select','insert','update','delete','truncate','references','trigger','maintain']) p
   where has_table_privilege(r,'public.'||t,p)),
  0,'no client role holds any privilege on any Development application ledger relation');

-- Stated individually for the two relations that carry the sensitive payload, so
-- a failure names the table rather than a count.
select ok(not has_table_privilege('authenticated','public.development_template_application_snapshots','select'),
  'authenticated cannot select application snapshots');
select ok(not has_table_privilege('authenticated','public.development_template_application_lineage','select'),
  'authenticated cannot select lineage');
select ok(not has_table_privilege('anon','public.development_template_application_snapshots','select'),
  'anon cannot select application snapshots');
select ok(not has_table_privilege('service_role','public.development_template_application_snapshots','select'),
  'service_role still cannot select application snapshots');

-- ---------------------------------------------------------------------------
-- PRESERVED — RLS and the member-scoped policies stay as defence in depth
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relrowsecurity
     and c.relname in ('development_template_applications','development_template_application_attempts',
                       'development_template_application_snapshots','development_template_application_lineage')),
  4,'RLS remains enabled on all four ledger relations');
select is(
  (select count(*)::int from pg_policies
   where schemaname='public' and cmd='SELECT'
     and tablename in ('development_template_applications','development_template_application_attempts',
                       'development_template_application_snapshots','development_template_application_lineage')),
  4,'the four member-scoped SELECT policies are retained, unreachable but intact');

-- The audit sibling keeps its own, stricter posture — untouched by this slice.
select ok(has_table_privilege('authenticated','public.development_template_application_audit','select'),
  'the audit table keeps its own owner/admin/hr-scoped read');

-- ---------------------------------------------------------------------------
-- CONTINUITY — the trusted boundaries are unaffected
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER + RLS not forced is what lets these keep reading the tables
-- after the grant is gone. If either property regressed, the closure above would
-- have broken the product instead of protecting it.
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relforcerowsecurity
     and c.relname in ('development_template_applications','development_template_application_attempts',
                       'development_template_application_snapshots','development_template_application_lineage')),
  0,'RLS is not FORCED, so the definer owner still reads the ledger');
select is(
  (select count(*)::int from unnest(array[
     'public.reserve_development_template_application_v1(jsonb)',
     'public.complete_development_template_application_v1(jsonb,uuid)',
     'public.get_company_retention_pressure_v1(uuid)',
     'public.get_authorized_development_plan_origins_v1(uuid,uuid)']) s(sig)
   join pg_proc p on p.oid=to_regprocedure(s.sig)
   where p.prosecdef and p.proconfig is not null),
  4,'every ledger reader is still SECURITY DEFINER with a fixed search_path');

-- 0133 keeps its exact contract: it is the replacement capability.
select is((select pg_get_function_result('public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure)),
  'TABLE(plan_id uuid, template_id uuid, template_version_id uuid, template_name text, template_version_number integer)',
  'the historical origin boundary still returns its five approved columns');
select ok(has_function_privilege('authenticated','public.get_authorized_development_plan_origins_v1(uuid,uuid)','execute'),
  'authenticated may still execute the historical origin boundary');
select is(
  (select count(*)::int from pg_proc p
   cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
   where p.oid='public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure
     and a.privilege_type='EXECUTE' and (a.grantee=0 or a.grantee in ('anon'::regrole,'service_role'::regrole))),
  0,'and nobody else may');

-- Retention is untouched: still exactly the four ledger relations.
select set_eq(
  $$select relation_name from public.get_company_retention_pressure_v1('00000000-0000-4000-8000-000000000000')$$,
  $$values ('development_template_applications'::text),
           ('development_template_application_attempts'::text),
           ('development_template_application_snapshots'::text),
           ('development_template_application_lineage'::text)$$,
  'the 0126 four-relation retention contract is unchanged');

-- ---------------------------------------------------------------------------
-- BEHAVIOUR — an entitled actor reads the origin, never the table
-- ---------------------------------------------------------------------------
-- The fixture is the whole argument: a plan whose subject is plainly entitled to
-- its origin, proving that closing the table did not close the capability.
insert into auth.users(id,email) values
 ('d5010000-0000-4000-8000-000000000001','dsec1-owner@example.com'),
 ('d5010000-0000-4000-8000-000000000002','dsec1-employee@example.com'),
 ('d5010000-0000-4000-8000-000000000003','dsec1-unrelated@example.com');
insert into public.companies(id,name,slug) values
 ('d5010000-0000-4000-8000-000000000101','D SEC One','d-sec-one');
insert into public.company_members(id,company_id,user_id,role,status) values
 ('d5010000-0000-4000-8000-000000000111','d5010000-0000-4000-8000-000000000101','d5010000-0000-4000-8000-000000000001','owner','active'),
 ('d5010000-0000-4000-8000-000000000112','d5010000-0000-4000-8000-000000000101','d5010000-0000-4000-8000-000000000002','employee','active'),
 ('d5010000-0000-4000-8000-000000000113','d5010000-0000-4000-8000-000000000101','d5010000-0000-4000-8000-000000000003','employee','active');
insert into public.people(id,company_id,user_id,full_name,status,manager_id) values
 ('d5010000-0000-4000-8000-000000000201','d5010000-0000-4000-8000-000000000101','d5010000-0000-4000-8000-000000000001','Owner','active',null),
 ('d5010000-0000-4000-8000-000000000202','d5010000-0000-4000-8000-000000000101','d5010000-0000-4000-8000-000000000002','Employee','active',null),
 ('d5010000-0000-4000-8000-000000000203','d5010000-0000-4000-8000-000000000101','d5010000-0000-4000-8000-000000000003','Unrelated','active',null);

insert into public.development_templates(id,company_id,name,description,scope,suggested_duration_days,active,created_by) values
 ('d5010000-0000-4000-8000-000000000301','d5010000-0000-4000-8000-000000000101','Trilha Interna',null,'company',60,true,'d5010000-0000-4000-8000-000000000001');
insert into public.development_template_versions(
  id,template_id,company_id,scope,version_number,status,name,description,
  suggested_duration_days,created_by,published_by,published_at) values
 ('d5010000-0000-4000-8000-000000000401','d5010000-0000-4000-8000-000000000301',
  'd5010000-0000-4000-8000-000000000101','company',2,'published','Trilha Interna',null,
  60,'d5010000-0000-4000-8000-000000000001','d5010000-0000-4000-8000-000000000001',now());

insert into public.development_plans(
  id,company_id,employee_id,created_by,owner_id,template_id,title,description,status,priority,updated_at) values
 ('d5010000-0000-4000-8000-000000000501','d5010000-0000-4000-8000-000000000101',
  'd5010000-0000-4000-8000-000000000202','d5010000-0000-4000-8000-000000000001',
  null,'d5010000-0000-4000-8000-000000000301','Plano do colaborador',null,'active','medium',now());

insert into public.development_template_applications(
  id,company_id,template_version_id,actor_user_id,technical_principal,
  idempotency_key,intent_fingerprint,correlation_id,status,result_plan_id,completed_at) values
 ('d5010000-0000-4000-8000-000000000601','d5010000-0000-4000-8000-000000000101',
  'd5010000-0000-4000-8000-000000000401','d5010000-0000-4000-8000-000000000001',
  'dsec1-test','dsec1-key','dsec1-fingerprint','d5010000-0000-4000-8000-000000000701',
  'succeeded','d5010000-0000-4000-8000-000000000501',now());

insert into public.development_template_application_snapshots(
  id,application_id,company_id,plan_id,format_version,snapshot) values
 ('d5010000-0000-4000-8000-000000000801','d5010000-0000-4000-8000-000000000601',
  'd5010000-0000-4000-8000-000000000101','d5010000-0000-4000-8000-000000000501',1,
  jsonb_build_object(
    'formatVersion',1,
    'template',jsonb_build_object(
      'id','d5010000-0000-4000-8000-000000000301',
      'versionId','d5010000-0000-4000-8000-000000000401',
      'versionNumber','2','scope','company','name','Trilha Interna',
      'description',null,'suggestedDurationDays','60'),
    -- The field that motivates the whole slice: a named employee's assessed level.
    'plan',jsonb_build_object('employeeId','d5010000-0000-4000-8000-000000000202'),
    'goals',jsonb_build_array(
      jsonb_build_object('currentLevel',2,'appliedTargetLevel',4,
        'competency',jsonb_build_object('name','Competência Sensível')))));

insert into public.development_template_application_lineage(
  id,application_id,snapshot_id,plan_id,template_version_id,company_id) values
 ('d5010000-0000-4000-8000-000000000901','d5010000-0000-4000-8000-000000000601',
  'd5010000-0000-4000-8000-000000000801','d5010000-0000-4000-8000-000000000501',
  'd5010000-0000-4000-8000-000000000401','d5010000-0000-4000-8000-000000000101');

set local role authenticated;

-- The subject: entitled to the plan, therefore entitled to its origin.
select set_config('request.jwt.claims','{"sub":"d5010000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(
  (select template_name from public.get_authorized_development_plan_origins_v1(
     'd5010000-0000-4000-8000-000000000101','d5010000-0000-4000-8000-000000000501')),
  'Trilha Interna','the subject still reads the historical origin of their own plan');
select throws_ok(
  $$select count(*) from public.development_template_application_snapshots$$,
  '42501',null,'...and still cannot read the snapshot table that produced it');
select throws_ok(
  $$select count(*) from public.development_template_application_lineage$$,
  '42501',null,'...nor the lineage table');

-- An administrative actor: tenant-wide on plans, still not on the ledger.
select set_config('request.jwt.claims','{"sub":"d5010000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(
  (select count(*)::int from public.get_authorized_development_plan_origins_v1(
     'd5010000-0000-4000-8000-000000000101',null)),
  1,'an owner/admin/hr actor still reads tenant plan origins');
select throws_ok(
  $$select count(*) from public.development_template_application_snapshots$$,
  '42501',null,'...and administrative authority still grants no direct table read');

-- The unrelated member: this is the exposure that is now closed. Before 0134 the
-- tenant-wide policy let them read the snapshot, competency levels included.
select set_config('request.jwt.claims','{"sub":"d5010000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok(
  $$select snapshot from public.development_template_application_snapshots$$,
  '42501',null,'an unrelated member can no longer read a colleague''s assessed levels');
select is(
  (select count(*)::int from public.get_authorized_development_plan_origins_v1(
     'd5010000-0000-4000-8000-000000000101',null)),
  0,'and the origin boundary refuses them too — closure did not become the only guard');

select * from finish();
rollback;
