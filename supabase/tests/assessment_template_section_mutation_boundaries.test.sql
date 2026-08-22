begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

select has_function('public','create_tenant_assessment_template_v1',
  array['uuid','text','text','text','text','text']);
select has_function('public','update_tenant_assessment_template_v1',
  array['uuid','uuid','text','text','text','text','text']);
select has_function('public','archive_tenant_assessment_template_v1',array['uuid','uuid']);
select has_function('public','create_tenant_assessment_section_v1',
  array['uuid','uuid','text','text','text','text','text','numeric','integer','boolean']);
select has_function('public','update_tenant_assessment_section_v1',
  array['uuid','uuid','uuid','text','text','text','text','text','numeric','integer','boolean']);
select has_function('public','archive_tenant_assessment_section_v1',array['uuid','uuid']);

select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_assessment_template_v1','update_tenant_assessment_template_v1',
    'archive_tenant_assessment_template_v1','create_tenant_assessment_section_v1',
    'update_tenant_assessment_section_v1','archive_tenant_assessment_section_v1')
    and p.prosecdef and p.proconfig=array['search_path=public, pg_temp']),6::bigint,
  'all six boundaries use hardened SECURITY DEFINER configuration');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_assessment_template_v1','update_tenant_assessment_template_v1',
    'archive_tenant_assessment_template_v1','create_tenant_assessment_section_v1',
    'update_tenant_assessment_section_v1','archive_tenant_assessment_section_v1')
    and has_function_privilege('authenticated',p.oid,'execute')),6::bigint,
  'authenticated can execute all trusted boundaries');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'create_tenant_assessment_template_v1','update_tenant_assessment_template_v1',
    'archive_tenant_assessment_template_v1','create_tenant_assessment_section_v1',
    'update_tenant_assessment_section_v1','archive_tenant_assessment_section_v1')
    and (has_function_privilege('anon',p.oid,'execute')
      or has_function_privilege('public',p.oid,'execute')
      or has_function_privilege('service_role',p.oid,'execute'))),0::bigint,
  'anon, PUBLIC and service_role cannot execute mutations');

select ok(not has_table_privilege('authenticated','public.assessment_templates','insert')
  and not has_table_privilege('authenticated','public.assessment_templates','update')
  and not has_table_privilege('authenticated','public.assessment_templates','delete')
  and not has_table_privilege('authenticated','public.assessment_templates','truncate')
  and not has_table_privilege('authenticated','public.assessment_templates','trigger')
  and not has_table_privilege('authenticated','public.assessment_templates','maintain'),
  'authenticated direct template mutations are closed');
select ok(not has_table_privilege('authenticated','public.assessment_sections','insert')
  and not has_table_privilege('authenticated','public.assessment_sections','update')
  and not has_table_privilege('authenticated','public.assessment_sections','delete')
  and not has_table_privilege('authenticated','public.assessment_sections','truncate')
  and not has_table_privilege('authenticated','public.assessment_sections','trigger')
  and not has_table_privilege('authenticated','public.assessment_sections','maintain'),
  'authenticated direct section mutations are closed');
select ok(not has_table_privilege('anon','public.assessment_templates','insert')
  and not has_table_privilege('anon','public.assessment_templates','update')
  and not has_table_privilege('anon','public.assessment_templates','delete')
  and not has_table_privilege('anon','public.assessment_templates','truncate')
  and not has_table_privilege('anon','public.assessment_templates','trigger')
  and not has_table_privilege('anon','public.assessment_templates','maintain')
  and not has_table_privilege('anon','public.assessment_sections','insert')
  and not has_table_privilege('anon','public.assessment_sections','update')
  and not has_table_privilege('anon','public.assessment_sections','delete')
  and not has_table_privilege('anon','public.assessment_sections','truncate')
  and not has_table_privilege('anon','public.assessment_sections','trigger')
  and not has_table_privilege('anon','public.assessment_sections','maintain'),
  'anon direct mutation privileges are closed');

insert into auth.users (id,email) values
  ('ac000000-0000-4000-8000-000000000001','owner-ats@example.com'),
  ('ac000000-0000-4000-8000-000000000002','manager-ats@example.com'),
  ('ac000000-0000-4000-8000-000000000003','admin-ats@example.com'),
  ('ac000000-0000-4000-8000-000000000004','hr-ats@example.com');
insert into public.companies (id,name,slug) values
  ('ac000000-0000-4000-8000-000000000101','ATS Alpha','ats-alpha'),
  ('ac000000-0000-4000-8000-000000000102','ATS Beta','ats-beta');
insert into public.company_members (id,company_id,user_id,role,status) values
  ('ac000000-0000-4000-8000-000000000111','ac000000-0000-4000-8000-000000000101','ac000000-0000-4000-8000-000000000001','owner','active'),
  ('ac000000-0000-4000-8000-000000000112','ac000000-0000-4000-8000-000000000102','ac000000-0000-4000-8000-000000000001','admin','active'),
  ('ac000000-0000-4000-8000-000000000113','ac000000-0000-4000-8000-000000000101','ac000000-0000-4000-8000-000000000002','manager','active'),
  ('ac000000-0000-4000-8000-000000000114','ac000000-0000-4000-8000-000000000101','ac000000-0000-4000-8000-000000000003','admin','active'),
  ('ac000000-0000-4000-8000-000000000115','ac000000-0000-4000-8000-000000000101','ac000000-0000-4000-8000-000000000004','hr','active');
insert into public.assessment_templates (id,company_id,name,type,status,active) values
  ('ac000000-0000-4000-8000-000000000201','ac000000-0000-4000-8000-000000000101','Second Alpha','annual','draft',false),
  ('ac000000-0000-4000-8000-000000000202','ac000000-0000-4000-8000-000000000102','Beta Template','annual','active',true),
  ('ac000000-0000-4000-8000-000000000203','ac000000-0000-4000-8000-000000000101','Archived Alpha','annual','archived',false);

create temporary table ats_result(kind text primary key,id uuid);
grant select,insert on ats_result to authenticated;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_assessment_template_v1(
  'ac000000-0000-4000-8000-000000000101','Manager denied',null,null,
  'annual','draft')$$,'42501','TENANT_AUTHORIZATION_DENIED',
  'manager cannot create an assessment template');

select set_config('request.jwt.claims',
  '{"sub":"ac000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select public.create_tenant_assessment_template_v1(
  'ac000000-0000-4000-8000-000000000101','Admin Template',null,null,
  'annual','draft')$$,'admin can create an assessment template');
select set_config('request.jwt.claims',
  '{"sub":"ac000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select lives_ok($$select public.create_tenant_assessment_template_v1(
  'ac000000-0000-4000-8000-000000000101','HR Template',null,null,
  'annual','draft')$$,'hr can create an assessment template');

select set_config('request.jwt.claims',
  '{"sub":"ac000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into ats_result values ('template',(
  public.create_tenant_assessment_template_v1(
    'ac000000-0000-4000-8000-000000000101','Annual Review','Initial','Guide',
    'annual','draft')->>'assessmentTemplateId')::uuid);
select is((public.update_tenant_assessment_template_v1(
  'ac000000-0000-4000-8000-000000000101',
  (select id from ats_result where kind='template'),'Annual Review Updated',
  'Updated','Guide 2','semester','active'))->>'status','succeeded',
  'authorized template update succeeds');
select throws_ok($$select public.update_tenant_assessment_template_v1(
  'ac000000-0000-4000-8000-000000000102',
  (select id from ats_result where kind='template'),'Cannot move',null,null,
  'annual','draft')$$,'P0002','ASSESSMENT_TEMPLATE_NOT_FOUND',
  'template cannot be reassigned to another company');

insert into ats_result values ('section',(
  public.create_tenant_assessment_section_v1(
    'ac000000-0000-4000-8000-000000000101',
    (select id from ats_result where kind='template'),'COM','Communication',
    'Description','message-circle','blue',1,1,true)
  ->>'assessmentSectionId')::uuid);
select is((public.update_tenant_assessment_section_v1(
  'ac000000-0000-4000-8000-000000000101',
  (select id from ats_result where kind='section'),
  (select id from ats_result where kind='template'),'COL','Collaboration',
  'Updated','users','emerald',2,3,true))->>'status','succeeded',
  'authorized section update including display order succeeds');
select throws_ok($$select public.create_tenant_assessment_section_v1(
  'ac000000-0000-4000-8000-000000000101',
  'ac000000-0000-4000-8000-000000000202','X','Cross tenant',null,null,null,
  1,1,true)$$,'P0002','ASSESSMENT_TEMPLATE_NOT_FOUND',
  'cross-tenant template is rejected');
select throws_ok($$select public.create_tenant_assessment_section_v1(
  'ac000000-0000-4000-8000-000000000101',
  'ac000000-0000-4000-8000-000000000203','X','Archived target',null,null,null,
  1,1,true)$$,'P0002','ASSESSMENT_TEMPLATE_NOT_FOUND',
  'archived template cannot receive a new section');
select throws_ok($$select public.update_tenant_assessment_section_v1(
  'ac000000-0000-4000-8000-000000000101',
  (select id from ats_result where kind='section'),
  'ac000000-0000-4000-8000-000000000201','X','Cannot move',null,null,null,
  1,1,true)$$,'23514','ASSESSMENT_SECTION_TEMPLATE_IMMUTABLE',
  'section cannot move to a different same-tenant template');
select throws_ok($$select public.create_tenant_assessment_section_v1(
  'ac000000-0000-4000-8000-000000000101',
  (select id from ats_result where kind='template'),'DUP','Collaboration',null,
  null,null,1,4,true)$$,'23505','CONFLICT',
  'duplicate section name returns the stable conflict contract');

select is((public.archive_tenant_assessment_section_v1(
  'ac000000-0000-4000-8000-000000000101',
  (select id from ats_result where kind='section')))->>'status','succeeded',
  'section archive succeeds');
select is((public.archive_tenant_assessment_section_v1(
  'ac000000-0000-4000-8000-000000000101',
  (select id from ats_result where kind='section')))->>'status','already_archived',
  'section archive is idempotent');
select is((public.archive_tenant_assessment_template_v1(
  'ac000000-0000-4000-8000-000000000101',
  (select id from ats_result where kind='template')))->>'status','succeeded',
  'template archive succeeds');
select is((public.archive_tenant_assessment_template_v1(
  'ac000000-0000-4000-8000-000000000101',
  (select id from ats_result where kind='template')))->>'status','already_archived',
  'template archive is idempotent');
reset role;

select is((select name from public.assessment_templates
  where id=(select id from ats_result where kind='template')),
  'Annual Review Updated','template create and update persist through RPCs');
select ok((select status='archived' and not active and deleted_at is not null
  from public.assessment_templates
  where id=(select id from ats_result where kind='template')),
  'template archive persists existing logical semantics');
select ok((select name='Collaboration' and display_order=3 and not active
    and deleted_at is not null and assessment_template_id=(select id from ats_result where kind='template')
  from public.assessment_sections
  where id=(select id from ats_result where kind='section')),
  'section update and archive persist without moving ownership');
select ok(exists(select 1 from public.assessment_templates
  where company_id is null and deleted_at is null),
  'legacy global-template semantics remain preserved');
select is((select count(*)::int from public.assessment_questions
  where company_id='ac000000-0000-4000-8000-000000000101'),0,
  'template and section mutations do not create questions');
select is((select count(*)::int from public.employee_competencies
  where company_id='ac000000-0000-4000-8000-000000000101'),0,
  'template and section mutations do not write employee competencies');
select is((select count(*)::int from public.development_plans
  where company_id='ac000000-0000-4000-8000-000000000101'),0,
  'template and section mutations do not write development persistence');

select * from finish();
rollback;
