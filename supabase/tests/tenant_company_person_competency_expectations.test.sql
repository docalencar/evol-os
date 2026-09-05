begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- Slice 5D-0 — exact bulk contract and hardened posture.
select has_function('public','get_tenant_company_person_competency_expectations_v1',array['uuid']::text[]);
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_tenant_company_person_competency_expectations_v1'),
  1::bigint,'bulk function name is unique');
select is((select proargnames from pg_proc
  where oid='public.get_tenant_company_person_competency_expectations_v1(uuid)'::regprocedure),
  array['p_company_id','assignment_state','person_id','position_id',
    'position_seniority_profile_id','seniority_level_id','competency_id','competency_name',
    'expected_level','weight','required','competency_type','expectation_notes',
    'expectation_source','inherited','employee_competency_id','current_level',
    'evidence_source','validated_at']::text[],
  'return column names match 0123 exactly');
select is((select array_agg(format_type(type_oid,null) order by ordinal)
  from pg_proc p, unnest(p.proallargtypes) with ordinality t(type_oid,ordinal)
  where p.oid='public.get_tenant_company_person_competency_expectations_v1(uuid)'::regprocedure),
  array['uuid','text','uuid','uuid','uuid','uuid','uuid','text','integer','integer',
    'boolean','text','text','text','boolean','uuid','integer','text',
    'timestamp with time zone']::text[],
  'return column types match 0123 exactly');
select ok(p.prosecdef and p.provolatile='s'
    and p.proconfig=array['search_path=public, pg_temp']::text[],
  'bulk boundary is STABLE SECURITY DEFINER with hardened search_path')
from pg_proc p where p.oid='public.get_tenant_company_person_competency_expectations_v1(uuid)'::regprocedure;
select ok(has_function_privilege('authenticated',
  'public.get_tenant_company_person_competency_expectations_v1(uuid)','execute'),
  'authenticated has execute');
select ok(not has_function_privilege('anon',
  'public.get_tenant_company_person_competency_expectations_v1(uuid)','execute'),
  'anon has no execute');
select ok(not has_function_privilege('service_role',
  'public.get_tenant_company_person_competency_expectations_v1(uuid)','execute'),
  'service_role has no execute');
select ok(not has_function_privilege('public',
  'public.get_tenant_company_person_competency_expectations_v1(uuid)','execute'),
  'PUBLIC has no execute');
select ok(not has_table_privilege('anon','public.position_seniority_profiles','select')
    and not has_table_privilege('authenticated','public.position_seniority_profiles','select'),
  'profiles table remains closed');
select ok(not has_table_privilege('anon','public.position_seniority_competencies','select')
    and not has_table_privilege('authenticated','public.position_seniority_competencies','select'),
  'expectations table remains closed');
select ok(pg_get_functiondef(
    'public.get_tenant_company_person_competency_expectations_v1(uuid)'::regprocedure
  ) !~* 'assessment',
  'bulk boundary has no assessment dependency');
select ok(pg_get_functiondef(
    'public.get_tenant_company_person_competency_expectations_v1(uuid)'::regprocedure
  ) !~* 'coalesce\s*\(\s*(evidence\.)?current_level',
  'current_level is never coalesced');
select ok(pg_get_functiondef(
    'public.get_tenant_company_person_competency_expectations_v1(uuid)'::regprocedure
  ) !~ 'get_tenant_person_competency_expectations_v1',
  'bulk implementation is set-based, not repeated person-RPC calls');

insert into auth.users (id,email) values
  ('d6000000-0000-4000-8000-000000000001','owner-5d0@example.com'),
  ('d6000000-0000-4000-8000-000000000002','admin-5d0@example.com'),
  ('d6000000-0000-4000-8000-000000000003','hr-5d0@example.com'),
  ('d6000000-0000-4000-8000-000000000004','employee-5d0@example.com'),
  ('d6000000-0000-4000-8000-000000000005','inactive-5d0@example.com'),
  ('d6000000-0000-4000-8000-000000000006','beta-owner-5d0@example.com');
insert into public.companies (id,name,slug) values
  ('d6000000-0000-4000-8000-000000000101','Five D Zero Alpha','five-d-zero-alpha'),
  ('d6000000-0000-4000-8000-000000000102','Five D Zero Beta','five-d-zero-beta');
insert into public.company_members (id,company_id,user_id,role,status) values
  ('d6000000-0000-4000-8000-000000000111','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000001','owner','active'),
  ('d6000000-0000-4000-8000-000000000112','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000002','admin','active'),
  ('d6000000-0000-4000-8000-000000000113','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000003','hr','active'),
  ('d6000000-0000-4000-8000-000000000114','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000004','employee','active'),
  ('d6000000-0000-4000-8000-000000000115','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000005','employee','inactive'),
  ('d6000000-0000-4000-8000-000000000116','d6000000-0000-4000-8000-000000000102','d6000000-0000-4000-8000-000000000006','owner','active');

insert into public.positions (id,company_id,name,status,deleted_at) values
  ('d6000000-0000-4000-8000-000000000201','d6000000-0000-4000-8000-000000000101','Active Position','active',null),
  ('d6000000-0000-4000-8000-000000000202','d6000000-0000-4000-8000-000000000101','Empty Position','active',null),
  ('d6000000-0000-4000-8000-000000000203','d6000000-0000-4000-8000-000000000101','Inactive Position','inactive',null),
  ('d6000000-0000-4000-8000-000000000204','d6000000-0000-4000-8000-000000000102','Beta Position','active',null);
insert into public.seniority_levels (id,company_id,code,label,rank,active) values
  ('d6000000-0000-4000-8000-000000000301','d6000000-0000-4000-8000-000000000101','SR5D0','Senior',1,true),
  ('d6000000-0000-4000-8000-000000000302','d6000000-0000-4000-8000-000000000101','OLD5D0','Old',2,false);
insert into public.position_seniority_profiles
  (id,company_id,position_id,seniority_level_id,active) values
  ('d6000000-0000-4000-8000-000000000401','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000201',null,true),
  ('d6000000-0000-4000-8000-000000000402','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000201','d6000000-0000-4000-8000-000000000301',true),
  ('d6000000-0000-4000-8000-000000000403','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000201','d6000000-0000-4000-8000-000000000301',false),
  ('d6000000-0000-4000-8000-000000000404','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000201','d6000000-0000-4000-8000-000000000302',true),
  ('d6000000-0000-4000-8000-000000000405','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000202',null,true),
  ('d6000000-0000-4000-8000-000000000406','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000203',null,true),
  ('d6000000-0000-4000-8000-000000000407','d6000000-0000-4000-8000-000000000102','d6000000-0000-4000-8000-000000000204',null,true);

insert into public.competencies (id,company_id,name,category,active) values
  ('d6000000-0000-4000-8000-000000000501','d6000000-0000-4000-8000-000000000101','Alpha','technical',true),
  ('d6000000-0000-4000-8000-000000000502','d6000000-0000-4000-8000-000000000101','Beta','behavioral',true),
  ('d6000000-0000-4000-8000-000000000503','d6000000-0000-4000-8000-000000000101','Gamma','leadership',true),
  ('d6000000-0000-4000-8000-000000000504','d6000000-0000-4000-8000-000000000101','Inactive','technical',false);
insert into public.position_seniority_competencies
  (id,company_id,position_seniority_profile_id,competency_id,expected_level,weight,required,type,notes,archived_at) values
  ('d6000000-0000-4000-8000-000000000601','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000401','d6000000-0000-4000-8000-000000000501',4,2,true,'core','base alpha',null),
  ('d6000000-0000-4000-8000-000000000602','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000401','d6000000-0000-4000-8000-000000000502',3,3,true,'leadership','base beta',null),
  ('d6000000-0000-4000-8000-000000000603','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000402','d6000000-0000-4000-8000-000000000501',2,5,false,'optional',null,null),
  ('d6000000-0000-4000-8000-000000000604','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000402','d6000000-0000-4000-8000-000000000503',5,4,true,'promotion','specific gamma',null),
  ('d6000000-0000-4000-8000-000000000605','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000401','d6000000-0000-4000-8000-000000000504',3,1,true,'core',null,null);

insert into public.people
  (id,company_id,user_id,full_name,status,position_id,position_seniority_profile_id) values
  ('d6000000-0000-4000-8000-000000000701','d6000000-0000-4000-8000-000000000101',null,'No Position','active',null,null),
  ('d6000000-0000-4000-8000-000000000702','d6000000-0000-4000-8000-000000000101',null,'Missing Profile','active','d6000000-0000-4000-8000-000000000201',null),
  ('d6000000-0000-4000-8000-000000000703','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000004','Base Person','active','d6000000-0000-4000-8000-000000000201','d6000000-0000-4000-8000-000000000401'),
  ('d6000000-0000-4000-8000-000000000704','d6000000-0000-4000-8000-000000000101',null,'Specific Leave','on_leave','d6000000-0000-4000-8000-000000000201','d6000000-0000-4000-8000-000000000402'),
  ('d6000000-0000-4000-8000-000000000705','d6000000-0000-4000-8000-000000000101',null,'Inactive Profile','active','d6000000-0000-4000-8000-000000000201','d6000000-0000-4000-8000-000000000403'),
  ('d6000000-0000-4000-8000-000000000706','d6000000-0000-4000-8000-000000000101',null,'Inactive Seniority','active','d6000000-0000-4000-8000-000000000201','d6000000-0000-4000-8000-000000000404'),
  ('d6000000-0000-4000-8000-000000000707','d6000000-0000-4000-8000-000000000101',null,'Inactive Position','active','d6000000-0000-4000-8000-000000000203','d6000000-0000-4000-8000-000000000406'),
  ('d6000000-0000-4000-8000-000000000708','d6000000-0000-4000-8000-000000000101',null,'No Expectations','active','d6000000-0000-4000-8000-000000000202','d6000000-0000-4000-8000-000000000405'),
  ('d6000000-0000-4000-8000-000000000709','d6000000-0000-4000-8000-000000000101',null,'Inactive Person','inactive',null,null),
  ('d6000000-0000-4000-8000-000000000710','d6000000-0000-4000-8000-000000000101',null,'Terminated Person','terminated',null,null),
  ('d6000000-0000-4000-8000-000000000711','d6000000-0000-4000-8000-000000000102',null,'Beta Person','active','d6000000-0000-4000-8000-000000000204','d6000000-0000-4000-8000-000000000407');

insert into public.employee_competencies
  (id,company_id,employee_id,competency_id,current_level,source,validated_at,archived_at) values
  ('d6000000-0000-4000-8000-000000000801','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000703','d6000000-0000-4000-8000-000000000501',3,'manager','2026-02-01T00:00:00Z',null),
  ('d6000000-0000-4000-8000-000000000802','d6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000704','d6000000-0000-4000-8000-000000000502',4,'assessment',null,'2026-02-02T00:00:00Z');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d6000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select lives_ok($$select * from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101')$$,
  'owner may read company-wide competency facts');
select is((select count(distinct person_id)::int
  from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101')),
  8,'all and only active/on_leave people are included');
select is((select count(*)::int
  from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101')
  where person_id in ('d6000000-0000-4000-8000-000000000709','d6000000-0000-4000-8000-000000000710','d6000000-0000-4000-8000-000000000711')),
  0,'inactive, terminated and cross-company people are excluded');
select is((select assignment_state from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101') where person_id='d6000000-0000-4000-8000-000000000701'),
  'no_position','no Position emits its sentinel');
select is((select assignment_state from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101') where person_id='d6000000-0000-4000-8000-000000000702'),
  'missing_profile','missing profile emits its sentinel');
select is((select count(*)::int from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101') where person_id in
    ('d6000000-0000-4000-8000-000000000705','d6000000-0000-4000-8000-000000000706','d6000000-0000-4000-8000-000000000707')
    and assignment_state='stale_assignment' and competency_id is null),
  3,'inactive profile, seniority and Position each emit one stale sentinel');
select is((select assignment_state from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101') where person_id='d6000000-0000-4000-8000-000000000708'),
  'active_assignment_with_no_expectations','active empty assignment emits its sentinel');
select is((select array_agg(competency_name order by competency_name)
  from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101') where person_id='d6000000-0000-4000-8000-000000000704'),
  array['Alpha','Beta','Gamma']::text[],
  'on-leave specific assignment includes override, Base fallback and specific-only facts');
select is((select expected_level::text||'/'||weight::text||'/'||required::text||'/'||competency_type||'/'
    ||coalesce(expectation_notes,'<null>')||'/'||expectation_source||'/'||inherited::text
  from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101')
  where person_id='d6000000-0000-4000-8000-000000000704'
    and competency_id='d6000000-0000-4000-8000-000000000501'),
  '2/5/false/optional/<null>/override/false','specific override replaces the whole Base row');
select is((select expectation_source||':'||inherited::text
  from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101')
  where person_id='d6000000-0000-4000-8000-000000000704'
    and competency_id='d6000000-0000-4000-8000-000000000502'),
  'base:true','specific assignment inherits a Base-only fact');
select ok((select employee_competency_id is null and current_level is null
  from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101')
  where person_id='d6000000-0000-4000-8000-000000000704'
    and competency_id='d6000000-0000-4000-8000-000000000502'),
  'archived or missing evidence remains NULL');
select is((select current_level from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101')
  where person_id='d6000000-0000-4000-8000-000000000703'
    and competency_id='d6000000-0000-4000-8000-000000000501'),
  3,'active current evidence is preserved');
select is((select count(*)::int from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101') where competency_id='d6000000-0000-4000-8000-000000000504'),
  0,'inactive catalog competency is excluded');
select is((select count(*)::int from (
  select person_id,competency_id from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101') where competency_id is not null
  group by person_id,competency_id having count(*) > 1
  ) duplicates),0,'no person has duplicate effective expectations');

-- Compare normalized complete factual rows rather than independent literals.
select is((select count(*)::int from (
  (select * from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101') where person_id='d6000000-0000-4000-8000-000000000703'
   except all
   select * from public.get_tenant_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000703'))
  union all
  (select * from public.get_tenant_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000703')
   except all
   select * from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101') where person_id='d6000000-0000-4000-8000-000000000703')
  ) difference),0,'bulk Base facts have full-row parity with 0123');
select is((select count(*)::int from (
  (select * from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101') where person_id='d6000000-0000-4000-8000-000000000704'
   except all
   select * from public.get_tenant_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000704'))
  union all
  (select * from public.get_tenant_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000704')
   except all
   select * from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101') where person_id='d6000000-0000-4000-8000-000000000704')
  ) difference),0,'bulk specific/on-leave facts have full-row parity with 0123');
select is((select count(*)::int from (
  (select * from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101') where person_id='d6000000-0000-4000-8000-000000000701'
   except all
   select * from public.get_tenant_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000701'))
  union all
  (select * from public.get_tenant_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101','d6000000-0000-4000-8000-000000000701')
   except all
   select * from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101') where person_id='d6000000-0000-4000-8000-000000000701')
  ) difference),0,'bulk sentinel facts have full-row parity with 0123');

select is((select array_agg(person_id::text||'/'||coalesce(competency_name,''))
  from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101')),
  (select array_agg(person_id::text||'/'||coalesce(competency_name,'')
    order by person_id,competency_name nulls first,competency_id)
   from public.get_tenant_company_person_competency_expectations_v1(
    'd6000000-0000-4000-8000-000000000101')),
  'bulk result ordering is deterministic by person then competency');

select set_config('request.jwt.claims','{"sub":"d6000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101')$$,'admin may read bulk facts');
select set_config('request.jwt.claims','{"sub":"d6000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select * from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101')$$,'hr may read bulk facts');
select set_config('request.jwt.claims','{"sub":"d6000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101')$$,'42501',
  'COMPANY_PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN','ordinary employee is denied even when self is included');
select set_config('request.jwt.claims','{"sub":"d6000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101')$$,'42501',
  'COMPANY_PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN','inactive membership is denied');
select set_config('request.jwt.claims','{"sub":"d6000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select * from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101')$$,'42501',
  'COMPANY_PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN','cross-tenant member receives the same safe denial');
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select * from public.get_tenant_company_person_competency_expectations_v1(
  'd6000000-0000-4000-8000-000000000101')$$,'28000','AUTH_REQUIRED','anonymous identity is denied');

reset role;
select set_config('request.jwt.claims','{}',true);
select * from finish();
rollback;
