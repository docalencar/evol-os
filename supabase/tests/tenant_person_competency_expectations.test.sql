begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- Slice 5A — exact contract and closed-boundary posture.
select has_function('public','get_tenant_person_competency_expectations_v1',array['uuid','uuid']::text[]);
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_tenant_person_competency_expectations_v1'),
  1::bigint,'function name is unique');
select is((select proargnames from pg_proc
  where oid='public.get_tenant_person_competency_expectations_v1(uuid,uuid)'::regprocedure),
  array['p_company_id','p_person_id','assignment_state','person_id','position_id',
    'position_seniority_profile_id','seniority_level_id','competency_id','competency_name',
    'expected_level','weight','required','competency_type','expectation_notes',
    'expectation_source','inherited','employee_competency_id','current_level',
    'evidence_source','validated_at']::text[],
  'return column names are exact');
select is((select array_agg(format_type(type_oid,null) order by ordinal)
  from pg_proc p, unnest(p.proallargtypes) with ordinality t(type_oid,ordinal)
  where p.oid='public.get_tenant_person_competency_expectations_v1(uuid,uuid)'::regprocedure),
  array['uuid','uuid','text','uuid','uuid','uuid','uuid','uuid','text','integer',
    'integer','boolean','text','text','text','boolean','uuid','integer','text',
    'timestamp with time zone']::text[],
  'return column types are exact');
select ok(p.prosecdef and p.provolatile='s'
    and p.proconfig=array['search_path=public, pg_temp']::text[],
  'boundary is STABLE SECURITY DEFINER with hardened search_path')
from pg_proc p where p.oid='public.get_tenant_person_competency_expectations_v1(uuid,uuid)'::regprocedure;
select ok(has_function_privilege('authenticated',
  'public.get_tenant_person_competency_expectations_v1(uuid,uuid)','execute'),
  'authenticated has execute');
select ok(not has_function_privilege('anon',
  'public.get_tenant_person_competency_expectations_v1(uuid,uuid)','execute'),
  'anon has no execute');
select ok(not has_function_privilege('service_role',
  'public.get_tenant_person_competency_expectations_v1(uuid,uuid)','execute'),
  'service_role has no execute');
select ok(not has_function_privilege('public',
  'public.get_tenant_person_competency_expectations_v1(uuid,uuid)','execute'),
  'PUBLIC has no execute');
select ok(not has_table_privilege('authenticated','public.position_seniority_profiles','select'),
  'profiles table remains closed');
select ok(not has_table_privilege('authenticated','public.seniority_levels','select'),
  'seniority table remains closed');
select ok(not has_table_privilege('authenticated','public.position_seniority_competencies','select'),
  'expectation table remains closed');
select ok(not has_table_privilege('authenticated','public.employee_competencies','select'),
  'evidence table remains closed');
select ok(pg_get_functiondef(
    'public.get_tenant_person_competency_expectations_v1(uuid,uuid)'::regprocedure
  ) !~* 'assessment',
  'boundary has no assessment dependency');
select ok(pg_get_functiondef(
    'public.get_tenant_person_competency_expectations_v1(uuid,uuid)'::regprocedure
  ) !~ '(?is)coalesce[^;]*current_level',
  'current_level is never coalesced');

-- Fixtures use only current schema domain values.
-- Disable only the Position/profile coherence trigger before fixture DML so one
-- structurally corrupt row can exercise the RPC's defense-in-depth. ROLLBACK
-- restores the trigger and every fixture.
alter table public.people disable trigger people_position_seniority_coherence_trigger;

insert into auth.users (id,email) values
  ('d5000000-0000-4000-8000-000000000001','owner-5a@example.com'),
  ('d5000000-0000-4000-8000-000000000002','admin-5a@example.com'),
  ('d5000000-0000-4000-8000-000000000003','hr-5a@example.com'),
  ('d5000000-0000-4000-8000-000000000004','self-5a@example.com'),
  ('d5000000-0000-4000-8000-000000000005','other-5a@example.com'),
  ('d5000000-0000-4000-8000-000000000006','inactive-5a@example.com'),
  ('d5000000-0000-4000-8000-000000000007','beta-5a@example.com');
insert into public.companies (id,name,slug) values
  ('d5000000-0000-4000-8000-000000000101','Five A Alpha','five-a-alpha'),
  ('d5000000-0000-4000-8000-000000000102','Five A Beta','five-a-beta');
insert into public.company_members (id,company_id,user_id,role,status) values
  ('d5000000-0000-4000-8000-000000000111','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000001','owner','active'),
  ('d5000000-0000-4000-8000-000000000112','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000002','admin','active'),
  ('d5000000-0000-4000-8000-000000000113','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000003','hr','active'),
  ('d5000000-0000-4000-8000-000000000114','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000004','employee','active'),
  ('d5000000-0000-4000-8000-000000000115','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000005','employee','active'),
  ('d5000000-0000-4000-8000-000000000116','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000006','employee','inactive'),
  ('d5000000-0000-4000-8000-000000000117','d5000000-0000-4000-8000-000000000102','d5000000-0000-4000-8000-000000000007','owner','active');

insert into public.positions (id,company_id,name,status,deleted_at) values
  ('d5000000-0000-4000-8000-000000000201','d5000000-0000-4000-8000-000000000101','Active Position','active',null),
  ('d5000000-0000-4000-8000-000000000202','d5000000-0000-4000-8000-000000000101','Empty Position','active',null),
  ('d5000000-0000-4000-8000-000000000203','d5000000-0000-4000-8000-000000000101','Inactive Position','inactive',null),
  ('d5000000-0000-4000-8000-000000000204','d5000000-0000-4000-8000-000000000101','Deleted Position','active','2026-01-01T00:00:00Z'),
  ('d5000000-0000-4000-8000-000000000205','d5000000-0000-4000-8000-000000000101','Other Position','active',null),
  ('d5000000-0000-4000-8000-000000000206','d5000000-0000-4000-8000-000000000102','Beta Position','active',null);
insert into public.seniority_levels (id,company_id,code,label,rank,active) values
  ('d5000000-0000-4000-8000-000000000301','d5000000-0000-4000-8000-000000000101','SR','Senior',1,true),
  ('d5000000-0000-4000-8000-000000000302','d5000000-0000-4000-8000-000000000101','OLD','Old',2,false);
insert into public.position_seniority_profiles
  (id,company_id,position_id,seniority_level_id,active) values
  ('d5000000-0000-4000-8000-000000000401','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000201',null,true),
  ('d5000000-0000-4000-8000-000000000402','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000201','d5000000-0000-4000-8000-000000000301',true),
  ('d5000000-0000-4000-8000-000000000403','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000201','d5000000-0000-4000-8000-000000000301',false),
  ('d5000000-0000-4000-8000-000000000404','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000201','d5000000-0000-4000-8000-000000000302',true),
  ('d5000000-0000-4000-8000-000000000405','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000202',null,true),
  ('d5000000-0000-4000-8000-000000000406','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000202','d5000000-0000-4000-8000-000000000301',true),
  ('d5000000-0000-4000-8000-000000000407','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000203',null,true),
  ('d5000000-0000-4000-8000-000000000408','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000204',null,true),
  ('d5000000-0000-4000-8000-000000000409','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000205',null,true),
  ('d5000000-0000-4000-8000-000000000410','d5000000-0000-4000-8000-000000000102','d5000000-0000-4000-8000-000000000206',null,true);

insert into public.competencies (id,company_id,name,category,active) values
  ('d5000000-0000-4000-8000-000000000501','d5000000-0000-4000-8000-000000000101','Alpha','technical',true),
  ('d5000000-0000-4000-8000-000000000502','d5000000-0000-4000-8000-000000000101','Beta','behavioral',true),
  ('d5000000-0000-4000-8000-000000000503','d5000000-0000-4000-8000-000000000101','Gamma','leadership',true),
  ('d5000000-0000-4000-8000-000000000504','d5000000-0000-4000-8000-000000000101','Inactive','technical',false),
  ('d5000000-0000-4000-8000-000000000505','d5000000-0000-4000-8000-000000000101','Not Expected','technical',true);
insert into public.position_seniority_competencies
  (id,company_id,position_seniority_profile_id,competency_id,expected_level,weight,required,type,notes,archived_at) values
  ('d5000000-0000-4000-8000-000000000601','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000401','d5000000-0000-4000-8000-000000000501',4,2,true,'core','base alpha',null),
  ('d5000000-0000-4000-8000-000000000602','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000401','d5000000-0000-4000-8000-000000000502',3,3,true,'leadership','base beta',null),
  ('d5000000-0000-4000-8000-000000000603','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000402','d5000000-0000-4000-8000-000000000501',2,5,false,'optional',null,null),
  ('d5000000-0000-4000-8000-000000000604','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000402','d5000000-0000-4000-8000-000000000503',5,4,true,'promotion','specific gamma',null),
  ('d5000000-0000-4000-8000-000000000605','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000401','d5000000-0000-4000-8000-000000000503',1,1,true,'core','archived row','2026-01-01T00:00:00Z'),
  ('d5000000-0000-4000-8000-000000000606','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000401','d5000000-0000-4000-8000-000000000504',3,1,true,'core',null,null),
  ('d5000000-0000-4000-8000-000000000607','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000405','d5000000-0000-4000-8000-000000000504',3,1,true,'core',null,null);

insert into public.people
  (id,company_id,user_id,full_name,status,position_id,position_seniority_profile_id) values
  ('d5000000-0000-4000-8000-000000000701','d5000000-0000-4000-8000-000000000101',null,'No Position','active',null,null),
  ('d5000000-0000-4000-8000-000000000702','d5000000-0000-4000-8000-000000000101',null,'Missing Profile','active','d5000000-0000-4000-8000-000000000201',null),
  ('d5000000-0000-4000-8000-000000000703','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000004','Base Person','active','d5000000-0000-4000-8000-000000000201','d5000000-0000-4000-8000-000000000401'),
  ('d5000000-0000-4000-8000-000000000704','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000005','Specific Person','active','d5000000-0000-4000-8000-000000000201','d5000000-0000-4000-8000-000000000402'),
  ('d5000000-0000-4000-8000-000000000705','d5000000-0000-4000-8000-000000000101',null,'Archived Profile','active','d5000000-0000-4000-8000-000000000201','d5000000-0000-4000-8000-000000000403'),
  ('d5000000-0000-4000-8000-000000000706','d5000000-0000-4000-8000-000000000101',null,'Inactive Seniority','active','d5000000-0000-4000-8000-000000000201','d5000000-0000-4000-8000-000000000404'),
  ('d5000000-0000-4000-8000-000000000707','d5000000-0000-4000-8000-000000000101',null,'Inactive Position','active','d5000000-0000-4000-8000-000000000203','d5000000-0000-4000-8000-000000000407'),
  ('d5000000-0000-4000-8000-000000000708','d5000000-0000-4000-8000-000000000101',null,'Deleted Position','active','d5000000-0000-4000-8000-000000000204','d5000000-0000-4000-8000-000000000408'),
  ('d5000000-0000-4000-8000-000000000709','d5000000-0000-4000-8000-000000000101',null,'Empty Base','active','d5000000-0000-4000-8000-000000000202','d5000000-0000-4000-8000-000000000405'),
  ('d5000000-0000-4000-8000-000000000710','d5000000-0000-4000-8000-000000000101',null,'Empty Specific','active','d5000000-0000-4000-8000-000000000202','d5000000-0000-4000-8000-000000000406'),
  ('d5000000-0000-4000-8000-000000000711','d5000000-0000-4000-8000-000000000102',null,'Beta Person','active','d5000000-0000-4000-8000-000000000206','d5000000-0000-4000-8000-000000000410'),
  ('d5000000-0000-4000-8000-000000000712','d5000000-0000-4000-8000-000000000101',null,'Corrupt Assignment','active','d5000000-0000-4000-8000-000000000201','d5000000-0000-4000-8000-000000000409');

insert into public.employee_competencies
  (id,company_id,employee_id,competency_id,current_level,source,validated_at,archived_at) values
  ('d5000000-0000-4000-8000-000000000801','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703','d5000000-0000-4000-8000-000000000501',3,'manager','2026-02-01T00:00:00Z',null),
  ('d5000000-0000-4000-8000-000000000802','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703','d5000000-0000-4000-8000-000000000505',5,'self',null,null),
  ('d5000000-0000-4000-8000-000000000803','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000704','d5000000-0000-4000-8000-000000000502',4,'assessment',null,'2026-02-02T00:00:00Z'),
  ('d5000000-0000-4000-8000-000000000804','d5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703','d5000000-0000-4000-8000-000000000502',1,'manual',null,null);

-- Client-contract assertions under authenticated/JWT.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d5000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select lives_ok($$select * from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')$$,
  'owner may read person competency expectations');

select is((select assignment_state from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000701')),
  'no_position','no Position returns one no_position sentinel');
select is((select count(*)::int from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000701')),
  1,'no_position emits exactly one row');
select ok((select competency_id is null and current_level is null
  from public.get_tenant_person_competency_expectations_v1(
    'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000702')),
  'missing_profile sentinel has no expectation or evidence');
select is((select assignment_state from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000702')),
  'missing_profile','Position without profile is explicit');

select is((select count(*)::int from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')),
  2,'active Base emits active eligible expectations only');
select is((select assignment_state from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703') limit 1),
  'active_assignment_with_expectations','active Base state is explicit');
select ok((select position_seniority_profile_id is not null and seniority_level_id is null
  from public.get_tenant_person_competency_expectations_v1(
    'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703') limit 1),
  'Base has a real profile id and NULL seniority id');
select is((select expectation_source||':'||inherited::text
  from public.get_tenant_person_competency_expectations_v1(
    'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')
  where competency_id='d5000000-0000-4000-8000-000000000501'),
  'base:false','Base expectation is own, never inherited');
select is((select current_level from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')
  where competency_id='d5000000-0000-4000-8000-000000000501'),
  3,'active evidence current_level is returned');
select is((select evidence_source from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')
  where competency_id='d5000000-0000-4000-8000-000000000501'),
  'manager','evidence provenance is preserved');
select is((select current_level from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')
  where competency_id='d5000000-0000-4000-8000-000000000502'),
  1,'evidence is scoped to the target person');
select is((select count(*)::int from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')
  where competency_id in ('d5000000-0000-4000-8000-000000000504','d5000000-0000-4000-8000-000000000505')),
  0,'inactive and non-expected competencies are excluded');

select is((select array_agg(competency_name order by competency_name)
  from public.get_tenant_person_competency_expectations_v1(
    'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000704')),
  array['Alpha','Beta','Gamma']::text[],
  'specific result includes override, Base-only and specific-only in deterministic order');
select is((select expectation_source||':'||inherited::text
  from public.get_tenant_person_competency_expectations_v1(
    'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000704')
  where competency_id='d5000000-0000-4000-8000-000000000502'),
  'base:true','specific assignment inherits Base-only competency');
select is((select expected_level::text||'/'||weight::text||'/'||required::text||'/'||competency_type||'/'
    ||coalesce(expectation_notes,'<null>')||'/'||expectation_source||'/'||inherited::text
  from public.get_tenant_person_competency_expectations_v1(
    'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000704')
  where competency_id='d5000000-0000-4000-8000-000000000501'),
  '2/5/false/optional/<null>/override/false','specific override replaces the whole row, including NULL notes');
select is((select count(*)::int from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000704')
  where competency_id='d5000000-0000-4000-8000-000000000501'),
  1,'effective competency has no duplicate');
select ok((select employee_competency_id is null and current_level is null
    and evidence_source is null and validated_at is null
  from public.get_tenant_person_competency_expectations_v1(
    'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000704')
  where competency_id='d5000000-0000-4000-8000-000000000502'),
  'archived evidence is missing evidence, represented only by NULL');

select is((select assignment_state from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000705')),
  'stale_assignment','archived assigned profile is stale');
select is((select assignment_state from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000706')),
  'stale_assignment','active profile with inactive seniority is stale');
select is((select assignment_state from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000707')),
  'stale_assignment','inactive Position assignment is stale');
select is((select assignment_state from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000708')),
  'stale_assignment','soft-deleted Position assignment is stale');
select ok((select competency_id is null and current_level is null
  from public.get_tenant_person_competency_expectations_v1(
    'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000705')),
  'stale sentinel emits neither expectation nor evidence');
select is((select assignment_state from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000709')),
  'active_assignment_with_no_expectations','all-inactive Base expectations produce explicit empty state');
select is((select assignment_state from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000710')),
  'active_assignment_with_no_expectations','active specific without eligible rows produces explicit empty state');

-- Admin and HR access.
select set_config('request.jwt.claims','{"sub":"d5000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')$$,
  'admin may read person competency expectations');
select set_config('request.jwt.claims','{"sub":"d5000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')$$,
  'hr may read person competency expectations');

-- Self access and ordinary-member denial for another person.
select set_config('request.jwt.claims','{"sub":"d5000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')$$,
  'target Person may read themself through current_person_id');
select set_config('request.jwt.claims','{"sub":"d5000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')$$,
  '42501','PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN','ordinary employee cannot read another person');

-- Safe denials: inactive member, outsider, unknown/cross-tenant target, no JWT.
select set_config('request.jwt.claims','{"sub":"d5000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')$$,
  '42501','PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN','inactive member denied');
select set_config('request.jwt.claims','{"sub":"d5000000-0000-4000-8000-000000000007","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')$$,
  '42501','PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN','non-member denied');
select set_config('request.jwt.claims','{"sub":"d5000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000711')$$,
  '42501','PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN','cross-tenant target uses safe denial');
select throws_ok($$select * from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000799')$$,
  '42501','PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN','unknown target uses same safe denial');
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select * from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000703')$$,
  '28000','AUTH_REQUIRED','missing authenticated identity denied');

-- Corrupt relationship fixture was inserted under the privileged setup role.
-- Query it only through the authenticated client contract.
select set_config('request.jwt.claims','{"sub":"d5000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_person_competency_expectations_v1(
  'd5000000-0000-4000-8000-000000000101','d5000000-0000-4000-8000-000000000712')$$,
  '23514','PERSON_COMPETENCY_ASSIGNMENT_INVALID','profile and Position incoherence fails closed');

reset role;
select set_config('request.jwt.claims','{}',true);
select * from finish();
rollback;
