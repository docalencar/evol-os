begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

select has_function('public','create_tenant_assessment_question_v1',
  array['uuid','uuid','uuid','text','text','text','text','integer','integer','numeric','integer','boolean','boolean']);
select has_function('public','update_tenant_assessment_question_v1',
  array['uuid','uuid','uuid','uuid','text','text','text','text','integer','integer','numeric','integer','boolean','boolean']);
select has_function('public','archive_tenant_assessment_question_v1',array['uuid','uuid']);
select col_is_null('public','assessment_questions','competency_id',
  'generic questions keep a nullable competency');
select fk_ok('public','assessment_questions',
  array['competency_id','company_id'],'public','competencies',array['id','company_id'],
  'question competency uses the composite tenant-safe key');

select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_assessment_question_v1','update_tenant_assessment_question_v1',
    'archive_tenant_assessment_question_v1') and p.prosecdef
    and p.proconfig=array['search_path=public, pg_temp']),3::bigint,
  'all question boundaries are hardened SECURITY DEFINER functions');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_assessment_question_v1','update_tenant_assessment_question_v1',
    'archive_tenant_assessment_question_v1')
    and has_function_privilege('authenticated',p.oid,'execute')),3::bigint,
  'authenticated can execute the trusted boundaries');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_assessment_question_v1','update_tenant_assessment_question_v1',
    'archive_tenant_assessment_question_v1')
    and (has_function_privilege('anon',p.oid,'execute')
      or has_function_privilege('public',p.oid,'execute')
      or has_function_privilege('service_role',p.oid,'execute'))),0::bigint,
  'anon, PUBLIC and service_role cannot execute mutations');

select ok(not has_table_privilege('authenticated','public.assessment_questions','insert')
  and not has_table_privilege('authenticated','public.assessment_questions','update')
  and not has_table_privilege('authenticated','public.assessment_questions','delete')
  and not has_table_privilege('authenticated','public.assessment_questions','truncate')
  and not has_table_privilege('authenticated','public.assessment_questions','trigger')
  and not has_table_privilege('authenticated','public.assessment_questions','maintain'),
  'authenticated direct mutation privileges are closed');
select ok(not has_table_privilege('anon','public.assessment_questions','insert')
  and not has_table_privilege('anon','public.assessment_questions','update')
  and not has_table_privilege('anon','public.assessment_questions','delete')
  and not has_table_privilege('anon','public.assessment_questions','truncate')
  and not has_table_privilege('anon','public.assessment_questions','trigger')
  and not has_table_privilege('anon','public.assessment_questions','maintain'),
  'anon direct mutation privileges are closed');

insert into auth.users (id,email) values
  ('ab000000-0000-4000-8000-000000000001','owner-a-aq@example.com'),
  ('ab000000-0000-4000-8000-000000000002','owner-b-aq@example.com');
insert into public.companies (id,name,slug) values
  ('ab000000-0000-4000-8000-000000000101','AQ Alpha','aq-alpha'),
  ('ab000000-0000-4000-8000-000000000102','AQ Beta','aq-beta');
insert into public.company_members (id,company_id,user_id,role,status) values
  ('ab000000-0000-4000-8000-000000000111','ab000000-0000-4000-8000-000000000101','ab000000-0000-4000-8000-000000000001','owner','active'),
  ('ab000000-0000-4000-8000-000000000112','ab000000-0000-4000-8000-000000000102','ab000000-0000-4000-8000-000000000002','owner','active');
insert into public.assessment_templates (id,company_id,name,type,status,active) values
  ('ab000000-0000-4000-8000-000000000201','ab000000-0000-4000-8000-000000000101','Alpha Template','annual','active',true);
insert into public.assessment_sections (id,company_id,assessment_template_id,name,weight,display_order,active) values
  ('ab000000-0000-4000-8000-000000000211','ab000000-0000-4000-8000-000000000101','ab000000-0000-4000-8000-000000000201','Skills',1,1,true);
insert into public.competencies (id,company_id,name,category,expected_level,weight,active) values
  ('ab000000-0000-4000-8000-000000000301','ab000000-0000-4000-8000-000000000101','Alpha Skill','technical',3,1,true),
  ('ab000000-0000-4000-8000-000000000302','ab000000-0000-4000-8000-000000000101','Alpha Other','technical',3,1,true),
  ('ab000000-0000-4000-8000-000000000303','ab000000-0000-4000-8000-000000000101','Inactive Skill','technical',3,1,false),
  ('ab000000-0000-4000-8000-000000000304','ab000000-0000-4000-8000-000000000102','Beta Skill','technical',3,1,true);

create temporary table aq_result(kind text primary key,id uuid);
grant select,insert on aq_result to authenticated;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

insert into aq_result values ('generic',((public.create_tenant_assessment_question_v1(
  'ab000000-0000-4000-8000-000000000101','ab000000-0000-4000-8000-000000000211',
  null,null,'Pergunta genérica válida',null,'text',0,1,1,1,true,true)
  ->>'assessmentQuestionId')::uuid));
insert into aq_result values ('linked',((public.create_tenant_assessment_question_v1(
  'ab000000-0000-4000-8000-000000000101','ab000000-0000-4000-8000-000000000211',
  'ab000000-0000-4000-8000-000000000301',null,'Avalie esta competência',null,
  'scale',1,5,1,2,true,true)->>'assessmentQuestionId')::uuid));

select throws_ok($$select public.create_tenant_assessment_question_v1(
  'ab000000-0000-4000-8000-000000000101','ab000000-0000-4000-8000-000000000211',
  'ab000000-0000-4000-8000-000000000304',null,'Competência de outro tenant',null,
  'scale',1,5,1,3,true,true)$$,'P0002','COMPETENCY_NOT_FOUND',
  'cross-tenant competency is rejected safely');
select throws_ok($$select public.create_tenant_assessment_question_v1(
  'ab000000-0000-4000-8000-000000000101','ab000000-0000-4000-8000-000000000211',
  'ab000000-0000-4000-8000-000000000303',null,'Competência inativa',null,
  'scale',1,5,1,3,true,true)$$,'P0002','COMPETENCY_NOT_FOUND',
  'inactive competency cannot be newly assigned');

reset role;
select is((select competency_id from public.assessment_questions
  where id=(select id from aq_result where kind='generic')),null::uuid,
  'generic create persists null competency');
select is((select competency_id from public.assessment_questions
  where id=(select id from aq_result where kind='linked')),
  'ab000000-0000-4000-8000-000000000301'::uuid,
  'linked create persists competency');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select is((public.update_tenant_assessment_question_v1(
  'ab000000-0000-4000-8000-000000000101',(select id from aq_result where kind='linked'),
  'ab000000-0000-4000-8000-000000000211','ab000000-0000-4000-8000-000000000301',
  null,'Mantém vínculo existente',null,'scale',1,5,1,2,true,true))->>'status','succeeded',
  'update preserves the current competency');
select is((public.update_tenant_assessment_question_v1(
  'ab000000-0000-4000-8000-000000000101',(select id from aq_result where kind='linked'),
  'ab000000-0000-4000-8000-000000000211','ab000000-0000-4000-8000-000000000302',
  null,'Substitui vínculo existente',null,'scale',1,5,1,2,true,true))->>'status','succeeded',
  'update replaces the competency');
select is((public.update_tenant_assessment_question_v1(
  'ab000000-0000-4000-8000-000000000101',(select id from aq_result where kind='linked'),
  'ab000000-0000-4000-8000-000000000211',null,null,'Remove vínculo existente',null,
  'scale',1,5,1,2,true,true))->>'status','succeeded',
  'update removes the competency');

select public.update_tenant_assessment_question_v1(
  'ab000000-0000-4000-8000-000000000101',(select id from aq_result where kind='linked'),
  'ab000000-0000-4000-8000-000000000211','ab000000-0000-4000-8000-000000000301',
  null,'Restaura vínculo histórico',null,'scale',1,5,1,2,true,true);
reset role;
update public.competencies set active=false
where id='ab000000-0000-4000-8000-000000000301';
set local role authenticated;
select is((public.update_tenant_assessment_question_v1(
  'ab000000-0000-4000-8000-000000000101',(select id from aq_result where kind='linked'),
  'ab000000-0000-4000-8000-000000000211','ab000000-0000-4000-8000-000000000301',
  null,'Edita preservando arquivada',null,'scale',1,5,1,2,true,true))->>'status','succeeded',
  'editing preserves an existing archived competency link');
select is((public.archive_tenant_assessment_question_v1(
  'ab000000-0000-4000-8000-000000000101',(select id from aq_result where kind='generic')))->>'status',
  'succeeded','question archive succeeds through the boundary');
reset role;

select ok(exists(select 1 from public.assessment_questions q
  join public.competencies c on c.id=q.competency_id and c.company_id=q.company_id
  where q.id=(select id from aq_result where kind='linked') and c.active=false),
  'logical competency archival preserves the historical relationship');
select is((select count(*)::int from public.employee_competencies
  where company_id='ab000000-0000-4000-8000-000000000101'),0,
  'question mutations never write employee competencies');

select * from finish();
rollback;
