begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- Slice 0127 — counts-only retention boundary for the Assessment execution
-- snapshot family.
--
-- The point of this boundary is that it discloses a NUMBER and never a ROW, and
-- that it does so without reversing the 0114 revoke. Both halves are asserted:
-- the function must work, and service_role must STILL be unable to read the
-- three snapshot tables directly.
--
-- The 0126 ledger boundary is asserted here too — not because this migration
-- touches it, but because "we added a second boundary and did not disturb the
-- first" is precisely the claim a reviewer needs checked.

-- 1. exact signature -------------------------------------------------------
select has_function('public','get_company_assessment_snapshot_pressure_v1',array['uuid']::text[]);

select is(
  (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'get_company_assessment_snapshot_pressure_v1'),
  1::bigint,
  'function name is unique — no overload can shadow the reviewed contract');

select is(
  (select proargnames from pg_proc
   where oid = 'public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure),
  array['p_company_id','relation_name','row_count']::text[],
  'argument and return column names are exact');

select is(
  (select array_agg(format_type(type_oid, null) order by ordinal)
     from pg_proc p, unnest(p.proallargtypes) with ordinality t(type_oid, ordinal)
   where p.oid = 'public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure),
  array['uuid','text','bigint']::text[],
  'returns relation_name text + row_count bigint, and nothing else');

-- 2 & 3. SECURITY DEFINER, non-volatile, hardened search_path --------------
select ok(
  p.prosecdef,
  'boundary is SECURITY DEFINER — that is what lets it count what service_role cannot read')
from pg_proc p
where p.oid = 'public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;

select is(
  (select provolatile from pg_proc
   where oid = 'public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure),
  's'::"char",
  'boundary is STABLE — it must never be able to write');

-- Assert the PROPERTY, not one spelling of it: the catalog stores
-- `SET search_path = ''` as `search_path=""`, quotes included.
select ok(
  (select count(*) = 1
     from unnest(p.proconfig) cfg
    where cfg like 'search_path=%'
      and btrim(split_part(cfg, '=', 2), '"') = ''),
  'search_path is pinned and effectively empty; every reference in the body is schema-qualified')
from pg_proc p
where p.oid = 'public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;

-- 4, 5, 6. execute privileges ---------------------------------------------
select ok(
  not has_function_privilege('anon',
    'public.get_company_assessment_snapshot_pressure_v1(uuid)', 'execute'),
  'anon cannot execute the boundary');

select ok(
  not has_function_privilege('authenticated',
    'public.get_company_assessment_snapshot_pressure_v1(uuid)', 'execute'),
  'authenticated cannot execute the boundary');

select ok(
  has_function_privilege('service_role',
    'public.get_company_assessment_snapshot_pressure_v1(uuid)', 'execute'),
  'service_role can execute the boundary');

-- 7. the 0114 boundary is INTACT — this is the whole point ------------------
select ok(
  not has_table_privilege('service_role','public.assessment_execution_snapshots','select')
  and not has_table_privilege('service_role','public.assessment_execution_snapshot_sections','select')
  and not has_table_privilege('service_role','public.assessment_execution_snapshot_questions','select'),
  'service_role STILL has no direct SELECT on any snapshot table');

select ok(
  not has_table_privilege('anon','public.assessment_execution_snapshots','select')
  and not has_table_privilege('authenticated','public.assessment_execution_snapshots','select')
  and not has_table_privilege('public','public.assessment_execution_snapshots','select'),
  'anon, authenticated and PUBLIC remain revoked (0114) — no browser path is opened');

select is(
  (select count(*) from pg_class
   where relnamespace = 'public'::regnamespace
     and relname in ('assessment_execution_snapshots',
                     'assessment_execution_snapshot_sections',
                     'assessment_execution_snapshot_questions')
     and relrowsecurity),
  3::bigint,
  'RLS on all three snapshot tables is still enabled');

-- 8. the companion boundary from 0126 is untouched -------------------------
select is(
  (select count(*) from public.get_company_retention_pressure_v1(gen_random_uuid())),
  4::bigint,
  'the 0126 ledger boundary still reports exactly its own four relations');

select ok(
  not has_table_privilege('service_role','public.development_template_applications','select'),
  'the 0069 revoke this migration does not touch is still in force');

-- fixtures -----------------------------------------------------------------
-- Two tenants, so cross-tenant leakage is provable rather than assumed. The
-- snapshot rows are produced by the product's own generation RPC rather than
-- inserted by hand: a fixture that writes the tables directly would prove the
-- boundary can count rows nobody can actually create.
insert into auth.users(id,email) values
 ('c7000000-0000-4000-8000-000000000001','snapshot-pressure@example.com');

insert into public.companies(id,name,slug) values
 ('c7000000-0000-4000-8000-000000000101','Snapshot Pressure A','snapshot-pressure-a'),
 ('c7000000-0000-4000-8000-000000000102','Snapshot Pressure B','snapshot-pressure-b');

insert into public.company_members(id,company_id,user_id,role,status) values
 ('c7000000-0000-4000-8000-000000000111','c7000000-0000-4000-8000-000000000101',
  'c7000000-0000-4000-8000-000000000001','owner','active');

insert into public.people(id,company_id,user_id,full_name,status) values
 ('c7000000-0000-4000-8000-000000000201','c7000000-0000-4000-8000-000000000101',
  'c7000000-0000-4000-8000-000000000001','Snapshot Pressure Owner','active');

insert into public.competencies(id,company_id,name,category,active) values
 ('c7000000-0000-4000-8000-000000000211','c7000000-0000-4000-8000-000000000101',
  'Pressure competency','technical',true);

insert into public.assessment_templates(id,company_id,name,description,instructions,type,status,active) values
 ('c7000000-0000-4000-8000-000000000301','c7000000-0000-4000-8000-000000000101',
  'Pressure Model','Model','Instructions','annual','active',true);

insert into public.assessment_sections(id,company_id,assessment_template_id,code,name,
  description,weight,display_order,active) values
 ('c7000000-0000-4000-8000-000000000401','c7000000-0000-4000-8000-000000000101',
  'c7000000-0000-4000-8000-000000000301','SEC','Pressure Section','Section',2,1,true);

insert into public.assessment_questions(id,template_id,company_id,assessment_section_id,
  competency_id,code,question,help_text,question_type,scale_min,scale_max,weight,
  required,active,display_order,order_index) values
 ('c7000000-0000-4000-8000-000000000501','c7000000-0000-4000-8000-000000000301',
  'c7000000-0000-4000-8000-000000000101','c7000000-0000-4000-8000-000000000401',
  'c7000000-0000-4000-8000-000000000211','Q1','Pressure question','Help','scale',0,10,3,true,true,1,1);

insert into public.assessment_cycles(id,company_id,name,assessment_type,status,start_date,end_date,
  assessment_template_id,allow_self_assessment,allow_manager_assessment,
  allow_peer_assessment,allow_direct_report_assessment,assessment_visibility) values
 ('c7000000-0000-4000-8000-000000000601','c7000000-0000-4000-8000-000000000101',
  'Pressure Cycle','performance','active',current_date,current_date+7,
  'c7000000-0000-4000-8000-000000000301',true,false,false,false,'full');

insert into public.assessment_cycle_participants(id,company_id,assessment_cycle_id,employee_id) values
 ('c7000000-0000-4000-8000-000000000701','c7000000-0000-4000-8000-000000000101',
  'c7000000-0000-4000-8000-000000000601','c7000000-0000-4000-8000-000000000201');

-- 9. a company with no snapshot rows counts 0 on every relation ------------
select is(
  (select count(*) from public.get_company_assessment_snapshot_pressure_v1(
     'c7000000-0000-4000-8000-000000000101')),
  3::bigint,
  'exactly three relations are reported');

select is(
  (select coalesce(sum(row_count),0)::bigint
     from public.get_company_assessment_snapshot_pressure_v1(
       'c7000000-0000-4000-8000-000000000101')),
  0::bigint,
  'a cycle that has not been generated yet has zero snapshot pressure');

-- 10. the three relation names are exact -----------------------------------
select is(
  (select array_agg(relation_name order by relation_name)
     from public.get_company_assessment_snapshot_pressure_v1(
       'c7000000-0000-4000-8000-000000000101')),
  array[
    'assessment_execution_snapshot_questions',
    'assessment_execution_snapshot_sections',
    'assessment_execution_snapshots'
  ]::text[],
  'reports exactly the three relations whose SELECT 0114 revoked from service_role');

-- generate real snapshot rows through the product ---------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"c7000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  (public.generate_tenant_assessment_cycle_responses_v1(
     'c7000000-0000-4000-8000-000000000101',
     'c7000000-0000-4000-8000-000000000601'))->>'createdResponseCount',
  '1',
  'generation creates the response, and with it the execution snapshot');
reset role;

-- 11. each of the three is counted, and can be told apart ------------------
select is(
  (select row_count from public.get_company_assessment_snapshot_pressure_v1(
     'c7000000-0000-4000-8000-000000000101')
   where relation_name = 'assessment_execution_snapshots'),
  1::bigint,
  'the snapshot root is counted for its own company');

select is(
  (select row_count from public.get_company_assessment_snapshot_pressure_v1(
     'c7000000-0000-4000-8000-000000000101')
   where relation_name = 'assessment_execution_snapshot_sections'),
  1::bigint,
  'the snapshot section is counted separately from the root');

select is(
  (select row_count from public.get_company_assessment_snapshot_pressure_v1(
     'c7000000-0000-4000-8000-000000000101')
   where relation_name = 'assessment_execution_snapshot_questions'),
  1::bigint,
  'the snapshot question is counted separately again — residual is per relation');

-- 12. no cross-tenant leakage ----------------------------------------------
select is(
  (select coalesce(sum(row_count),0)::bigint
     from public.get_company_assessment_snapshot_pressure_v1(
       'c7000000-0000-4000-8000-000000000102')),
  0::bigint,
  'another tenant sees none of it — counts never cross the company boundary');

select is(
  (select coalesce(sum(row_count),0)::bigint
     from public.get_company_assessment_snapshot_pressure_v1(null)),
  0::bigint,
  'a null company matches nothing rather than widening to every company');

-- 13. no payload leaks: the return type physically cannot carry a row ------
select is(
  (select count(*) from pg_proc p, unnest(p.proallargtypes) t(type_oid)
   where p.oid = 'public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure
     and format_type(t.type_oid, null) not in ('uuid','text','bigint')),
  0::bigint,
  'the signature admits only uuid/text/bigint — no row, record, json or composite');

select is(
  (select count(*) from public.get_company_assessment_snapshot_pressure_v1(
     'c7000000-0000-4000-8000-000000000101')
   where relation_name not like 'assessment_execution_snapshot%'),
  0::bigint,
  'no relation outside the reviewed closed list is ever reported');

-- 14. the boundary reads, it never writes -----------------------------------
-- An audited read RPC would append an activity_events row and manufacture the
-- very evidence the classifier is inspecting for. This one must be inert.
select is(
  (select count(*)::bigint from public.activity_events
   where company_id = 'c7000000-0000-4000-8000-000000000101'
     and activity_type like '%retention%'),
  0::bigint,
  'counting retention pressure writes no activity of its own');

select * from finish();
rollback;
