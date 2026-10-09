begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

select is((select count(*) from pg_constraint con join pg_class c on c.oid=con.conrelid
  where c.relname in ('assessment_responses','assessment_cycle_participants')
    and con.conname in (
      'assessment_responses_assessment_template_id_fkey',
      'assessment_responses_employee_id_fkey',
      'assessment_responses_evaluator_id_fkey',
      'assessment_cycle_participants_assessment_cycle_id_fkey',
      'assessment_cycle_participants_employee_id_fkey')
    and con.contype='f' and con.convalidated and con.confmatchtype='s'
    and con.confupdtype='a' and con.confdeltype='c'
    and array_length(con.conkey,1)=2),5::bigint,
  'the five canonical FK names now identify validated composite CASCADE constraints');

select is((select count(*) from pg_constraint con join pg_class c on c.oid=con.conrelid
  where c.relname in ('assessment_responses','assessment_cycle_participants')
    and con.conname like '%_company_fkey_new'),0::bigint,
  'no temporary FK name survives the migration');

select is((select count(*) from pg_indexes where schemaname='public'
  and tablename='assessment_responses'
  and indexname='assessment_responses_template_company_idx'
  and indexdef like '%(assessment_template_id, company_id)%'),1::bigint,
  'the one required template/company source index exists');

select is((select count(*) from pg_constraint con join pg_class s on s.oid=con.conrelid
  join pg_class t on t.oid=con.confrelid
  where s.relname='assessment_responses' and t.relname='people' and con.contype='f'),2::bigint,
  'PostgREST still sees exactly the named employee and evaluator relationships');
select is((select count(*) from pg_constraint con join pg_class s on s.oid=con.conrelid
  join pg_class t on t.oid=con.confrelid
  where s.relname='assessment_cycle_participants' and t.relname='people' and con.contype='f'),1::bigint,
  'participant people embedding remains unambiguous');

insert into public.companies(id,name,slug) values
 ('fb1b0000-0000-4000-8000-000000000001','F DB1b A','f-db1b-a'),
 ('fb1b0000-0000-4000-8000-000000000002','F DB1b B','f-db1b-b');
insert into auth.users(id,email) values
 ('fb1b0000-0000-4000-8000-000000000001','owner-f-db1b@example.com');
insert into public.company_members(id,company_id,user_id,role,status) values
 ('fb1b0000-0000-4000-8000-000000000011','fb1b0000-0000-4000-8000-000000000001',
  'fb1b0000-0000-4000-8000-000000000001','owner','active');
set session_replication_role=replica;
insert into public.people(id,company_id,user_id,full_name,status) values
 ('fb1b0000-0000-4000-8000-000000000101','fb1b0000-0000-4000-8000-000000000001',
  'fb1b0000-0000-4000-8000-000000000001','A employee','active'),
 ('fb1b0000-0000-4000-8000-000000000102','fb1b0000-0000-4000-8000-000000000001',null,'A evaluator','active'),
 ('fb1b0000-0000-4000-8000-000000000103','fb1b0000-0000-4000-8000-000000000002',null,'B employee','active');
insert into public.assessment_templates(id,company_id,name,type,active,status) values
 ('fb1b0000-0000-4000-8000-000000000201','fb1b0000-0000-4000-8000-000000000001','A template','annual',true,'active'),
 ('fb1b0000-0000-4000-8000-000000000202','fb1b0000-0000-4000-8000-000000000002','B template','annual',true,'active');
insert into public.assessment_cycles(id,company_id,name,assessment_type,status,start_date,end_date,assessment_template_id) values
 ('fb1b0000-0000-4000-8000-000000000301','fb1b0000-0000-4000-8000-000000000001','A cycle','performance','active',current_date,current_date+1,'fb1b0000-0000-4000-8000-000000000201'),
 ('fb1b0000-0000-4000-8000-000000000302','fb1b0000-0000-4000-8000-000000000002','B cycle','performance','active',current_date,current_date+1,'fb1b0000-0000-4000-8000-000000000202');
insert into public.assessment_execution_snapshots(id,company_id,assessment_cycle_id,source_assessment_template_id,template_name,template_type,capture_origin) values
 ('fb1b0000-0000-4000-8000-000000000401','fb1b0000-0000-4000-8000-000000000001','fb1b0000-0000-4000-8000-000000000301','fb1b0000-0000-4000-8000-000000000201','A template','annual','response_generation');
set session_replication_role=origin;

select throws_ok($$insert into public.assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective) values
 ('fb1b0000-0000-4000-8000-000000000501','fb1b0000-0000-4000-8000-000000000001','fb1b0000-0000-4000-8000-000000000301','fb1b0000-0000-4000-8000-000000000202','fb1b0000-0000-4000-8000-000000000401','fb1b0000-0000-4000-8000-000000000101','fb1b0000-0000-4000-8000-000000000102','draft','self')$$,'23503',null,'foreign-tenant template is rejected');
select throws_ok($$insert into public.assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective) values
 ('fb1b0000-0000-4000-8000-000000000502','fb1b0000-0000-4000-8000-000000000001','fb1b0000-0000-4000-8000-000000000301','fb1b0000-0000-4000-8000-000000000201','fb1b0000-0000-4000-8000-000000000401','fb1b0000-0000-4000-8000-000000000103','fb1b0000-0000-4000-8000-000000000102','draft','self')$$,'23503',null,'foreign-tenant response employee is rejected');
select throws_ok($$insert into public.assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective) values
 ('fb1b0000-0000-4000-8000-000000000503','fb1b0000-0000-4000-8000-000000000001','fb1b0000-0000-4000-8000-000000000301','fb1b0000-0000-4000-8000-000000000201','fb1b0000-0000-4000-8000-000000000401','fb1b0000-0000-4000-8000-000000000101','fb1b0000-0000-4000-8000-000000000103','draft','self')$$,'23503',null,'foreign-tenant evaluator is rejected');
select throws_ok($$insert into public.assessment_cycle_participants(company_id,assessment_cycle_id,employee_id) values
 ('fb1b0000-0000-4000-8000-000000000001','fb1b0000-0000-4000-8000-000000000302','fb1b0000-0000-4000-8000-000000000101')$$,'23503',null,'foreign-tenant participant cycle is rejected');
select throws_ok($$insert into public.assessment_cycle_participants(company_id,assessment_cycle_id,employee_id) values
 ('fb1b0000-0000-4000-8000-000000000001','fb1b0000-0000-4000-8000-000000000301','fb1b0000-0000-4000-8000-000000000103')$$,'23503',null,'foreign-tenant participant employee is rejected');

select lives_ok($$insert into public.assessment_cycle_participants(company_id,assessment_cycle_id,employee_id) values
 ('fb1b0000-0000-4000-8000-000000000001','fb1b0000-0000-4000-8000-000000000301','fb1b0000-0000-4000-8000-000000000101')$$,'same-tenant participant remains valid');
select lives_ok($$insert into public.assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective) values
 ('fb1b0000-0000-4000-8000-000000000504','fb1b0000-0000-4000-8000-000000000001','fb1b0000-0000-4000-8000-000000000301','fb1b0000-0000-4000-8000-000000000201','fb1b0000-0000-4000-8000-000000000401','fb1b0000-0000-4000-8000-000000000101','fb1b0000-0000-4000-8000-000000000102','draft','self')$$,'same-tenant response remains valid');

select lives_ok($$delete from public.people where id='fb1b0000-0000-4000-8000-000000000101'$$,'people delete preserves CASCADE behavior');
select is((select count(*) from public.assessment_responses where id='fb1b0000-0000-4000-8000-000000000504'),0::bigint,'employee CASCADE removes response');
select is((select count(*) from public.assessment_cycle_participants where employee_id='fb1b0000-0000-4000-8000-000000000101'),0::bigint,'employee CASCADE removes participant');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"fb1b0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.add_tenant_assessment_cycle_participants_v1(
  'fb1b0000-0000-4000-8000-000000000001','fb1b0000-0000-4000-8000-000000000301',
  array['fb1b0000-0000-4000-8000-000000000102'::uuid]))->>'addedParticipantCount','1',
  'participant RPC still writes through the composite FK');
select is((public.generate_tenant_assessment_cycle_responses_v1(
  'fb1b0000-0000-4000-8000-000000000001','fb1b0000-0000-4000-8000-000000000301'))
  ->>'status','succeeded','response-generation RPC still writes through the composite FKs');
reset role;

select * from finish();
rollback;
