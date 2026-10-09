begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

select is((select count(*) from pg_constraint con
  where con.conname in ('assessment_responses_assessment_cycle_id_fkey','assessment_answers_assessment_response_id_fkey')
    and con.contype='f' and con.convalidated and con.confmatchtype='s'
    and con.confupdtype='a' and con.confdeltype='c'
    and array_length(con.conkey,1)=2 and array_length(con.confkey,1)=2),2::bigint,
  'both lifecycle FKs are validated composite MATCH SIMPLE CASCADE constraints');

select is((select count(*) from pg_constraint where conname like '%_company_fkey_new'),0::bigint,
  'no temporary FK name survives');

select is((select count(*) from pg_constraint con join pg_class c on c.oid=con.conrelid
  where c.relname in ('assessment_cycles','assessment_responses') and con.contype='u'
    and array_length(con.conkey,1)=2
    and (select array_agg(a.attname::text order by k.ord) from unnest(con.conkey) with ordinality k(attnum,ord)
      join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.attnum)=array['id','company_id']::text[]),2::bigint,
  'both target candidate keys remain present');

select ok((select not attnotnull from pg_attribute
  where attrelid='public.assessment_answers'::regclass and attname='assessment_response_id'),
  'assessment_response_id remains nullable');

select is((select count(*) from pg_constraint con join pg_class s on s.oid=con.conrelid
  join pg_class t on t.oid=con.confrelid where s.relname='assessment_answers'
  and t.relname='assessment_responses' and con.contype='f'),2::bigint,
  'the pre-existing snapshot relationship remains alongside the canonical answer relationship');

insert into public.companies(id,name,slug) values
 ('fc1c0000-0000-4000-8000-000000000001','F DB1c A','f-db1c-a'),
 ('fc1c0000-0000-4000-8000-000000000002','F DB1c B','f-db1c-b');
set session_replication_role=replica;
insert into public.people(id,company_id,full_name,status) values
 ('fc1c0000-0000-4000-8000-000000000101','fc1c0000-0000-4000-8000-000000000001','A employee','active'),
 ('fc1c0000-0000-4000-8000-000000000102','fc1c0000-0000-4000-8000-000000000001','A evaluator','active');
insert into public.assessment_templates(id,company_id,name,type,active,status) values
 ('fc1c0000-0000-4000-8000-000000000201','fc1c0000-0000-4000-8000-000000000001','A template','annual',true,'active'),
 ('fc1c0000-0000-4000-8000-000000000202','fc1c0000-0000-4000-8000-000000000002','B template','annual',true,'active');
insert into public.assessment_cycles(id,company_id,name,assessment_type,status,start_date,end_date,assessment_template_id) values
 ('fc1c0000-0000-4000-8000-000000000301','fc1c0000-0000-4000-8000-000000000001','A cycle','performance','active',current_date,current_date+1,'fc1c0000-0000-4000-8000-000000000201'),
 ('fc1c0000-0000-4000-8000-000000000302','fc1c0000-0000-4000-8000-000000000002','B cycle','performance','active',current_date,current_date+1,'fc1c0000-0000-4000-8000-000000000202');
insert into public.assessment_execution_snapshots(id,company_id,assessment_cycle_id,source_assessment_template_id,template_name,template_type,capture_origin) values
 ('fc1c0000-0000-4000-8000-000000000401','fc1c0000-0000-4000-8000-000000000001','fc1c0000-0000-4000-8000-000000000301','fc1c0000-0000-4000-8000-000000000201','A template','annual','response_generation'),
 ('fc1c0000-0000-4000-8000-000000000402','fc1c0000-0000-4000-8000-000000000001','fc1c0000-0000-4000-8000-000000000302','fc1c0000-0000-4000-8000-000000000201','cross snapshot','annual','response_generation');
insert into public.assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective) values
 ('fc1c0000-0000-4000-8000-000000000501','fc1c0000-0000-4000-8000-000000000001','fc1c0000-0000-4000-8000-000000000301','fc1c0000-0000-4000-8000-000000000201','fc1c0000-0000-4000-8000-000000000401','fc1c0000-0000-4000-8000-000000000101','fc1c0000-0000-4000-8000-000000000102','draft','self');
-- The cascade fixture answer carries a response, so `assessment_answers_snapshot_presence_check`
-- (0114:313) requires BOTH snapshot columns to be present. `session_replication_role=replica`
-- suppresses foreign keys and triggers but NOT check constraints, which is why the
-- FK-free setup above succeeded while this row failed.
--
-- The snapshot section and question are created for real rather than referenced by
-- synthetic ids: the row then also satisfies the three composite FKs that 0114 and 0145
-- put on assessment_answers, so this fixture no longer depends on replica mode for
-- REFERENTIAL validity — only for insertion order.
insert into public.assessment_sections(id,company_id,assessment_template_id,name) values
 ('fc1c0000-0000-4000-8000-000000000601','fc1c0000-0000-4000-8000-000000000001','fc1c0000-0000-4000-8000-000000000201','A section');
insert into public.assessment_questions(id,template_id,company_id,assessment_section_id,question) values
 ('fc1c0000-0000-4000-8000-000000000602','fc1c0000-0000-4000-8000-000000000201','fc1c0000-0000-4000-8000-000000000001','fc1c0000-0000-4000-8000-000000000601','A question?');
insert into public.assessment_execution_snapshot_sections(id,company_id,assessment_execution_snapshot_id,source_assessment_section_id,name,weight,display_order,active_at_capture) values
 ('fc1c0000-0000-4000-8000-000000000603','fc1c0000-0000-4000-8000-000000000001','fc1c0000-0000-4000-8000-000000000401','fc1c0000-0000-4000-8000-000000000601','A section',1,0,true);
insert into public.assessment_execution_snapshot_questions(id,company_id,assessment_execution_snapshot_id,assessment_execution_snapshot_section_id,source_assessment_question_id,question,question_type,required,weight,display_order,scale_min,scale_max,active_at_capture) values
 ('fc1c0000-0000-4000-8000-000000000604','fc1c0000-0000-4000-8000-000000000001','fc1c0000-0000-4000-8000-000000000401','fc1c0000-0000-4000-8000-000000000603','fc1c0000-0000-4000-8000-000000000602','A question?','scale',true,1,0,1,5,true);
insert into public.assessment_answers(id,company_id,assessment_response_id,assessment_execution_snapshot_id,assessment_execution_snapshot_question_id,answer_text) values
 ('fc1c0000-0000-4000-8000-000000000605','fc1c0000-0000-4000-8000-000000000001','fc1c0000-0000-4000-8000-000000000501','fc1c0000-0000-4000-8000-000000000401','fc1c0000-0000-4000-8000-000000000604','cascade');
set session_replication_role=origin;

select throws_ok($$insert into public.assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective) values
 ('fc1c0000-0000-4000-8000-000000000502','fc1c0000-0000-4000-8000-000000000001','fc1c0000-0000-4000-8000-000000000302','fc1c0000-0000-4000-8000-000000000201','fc1c0000-0000-4000-8000-000000000402','fc1c0000-0000-4000-8000-000000000101','fc1c0000-0000-4000-8000-000000000102','draft','self')$$,
 '23503',null,'foreign-tenant cycle is rejected');

select throws_ok($$insert into public.assessment_answers(company_id,assessment_response_id,assessment_execution_snapshot_id,assessment_execution_snapshot_question_id,answer_text) values
 ('fc1c0000-0000-4000-8000-000000000002','fc1c0000-0000-4000-8000-000000000501','fc1c0000-0000-4000-8000-000000000401','fc1c0000-0000-4000-8000-000000000999','cross')$$,
 '23503',null,'foreign-tenant response is rejected');

select lives_ok($$insert into public.assessment_answers(id,company_id,assessment_response_id,answer_text) values
 ('fc1c0000-0000-4000-8000-000000000606','fc1c0000-0000-4000-8000-000000000001',null,'legacy')$$,
 'NULL assessment_response_id remains valid under MATCH SIMPLE');

select lives_ok($$delete from public.assessment_responses where id='fc1c0000-0000-4000-8000-000000000501'$$,
  'response delete preserves answer CASCADE behavior');
select is((select count(*) from public.assessment_answers where id='fc1c0000-0000-4000-8000-000000000605'),0::bigint,
  'response CASCADE removes its answer');
select is((select count(*) from public.assessment_answers
  where id='fc1c0000-0000-4000-8000-000000000606' and assessment_response_id is null),1::bigint,
  'legacy answer with NULL assessment_response_id survives the response delete');

select * from finish();
rollback;
