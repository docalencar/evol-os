begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

select has_function('public','create_tenant_position_competency_v1',
  array['uuid','uuid','uuid','integer','integer','boolean','text','text']);
select has_function('public','update_tenant_position_competency_v1',
  array['uuid','uuid','uuid','uuid','integer','integer','boolean','text','text']);
select has_function('public','archive_tenant_position_competency_v1',array['uuid','uuid']);

select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('create_tenant_position_competency_v1',
      'update_tenant_position_competency_v1','archive_tenant_position_competency_v1')
    and p.prosecdef and p.proconfig=array['search_path=public, pg_temp']
),3::bigint,'all boundaries are SECURITY DEFINER with hardened search_path');

select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('create_tenant_position_competency_v1',
      'update_tenant_position_competency_v1','archive_tenant_position_competency_v1')
    and has_function_privilege('authenticated',p.oid,'execute')
),3::bigint,'authenticated may execute all three boundaries');

select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('create_tenant_position_competency_v1',
      'update_tenant_position_competency_v1','archive_tenant_position_competency_v1')
    and (has_function_privilege('anon',p.oid,'execute')
      or has_function_privilege('service_role',p.oid,'execute'))
),0::bigint,'anon and service_role cannot execute the boundaries');

select ok(not has_table_privilege('authenticated','public.position_competencies','insert'),
  'direct insert remains closed');
select ok(not has_table_privilege('authenticated','public.position_competencies','update'),
  'direct update remains closed');
select ok(not has_table_privilege('authenticated','public.position_competencies','delete'),
  'direct delete remains closed');
select ok(not has_table_privilege('authenticated','public.position_competencies','truncate'),
  'direct truncate remains closed');
select ok(not has_table_privilege('authenticated','public.position_competencies','trigger'),
  'direct trigger creation remains closed');
select ok(not has_table_privilege('authenticated','public.position_competencies','maintain'),
  'direct table maintenance remains closed');
select ok(not has_table_privilege('anon','public.position_competencies','insert'),
  'anon direct insert remains closed');
select ok(not has_table_privilege('anon','public.position_competencies','update'),
  'anon direct update remains closed');
select ok(not has_table_privilege('anon','public.position_competencies','delete'),
  'anon direct delete remains closed');
select ok(not has_table_privilege('anon','public.position_competencies','truncate'),
  'anon direct truncate remains closed');
select ok(not has_table_privilege('anon','public.position_competencies','trigger'),
  'anon direct trigger creation remains closed');
select ok(not has_table_privilege('anon','public.position_competencies','maintain'),
  'anon direct table maintenance remains closed');

select is((
  select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('create_tenant_position_competency_v1',
      'update_tenant_position_competency_v1','archive_tenant_position_competency_v1')
    and has_function_privilege('public',p.oid,'execute')
),0::bigint,'PUBLIC cannot execute any Position Competency mutation boundary');

-- Reproduce the dangerous legacy bootstrap condition inside this transactional
-- test, then apply the exact 0108 closure and prove it converges safely.
grant insert, update, delete, truncate, trigger, maintain
  on table public.position_competencies to anon, authenticated;
select ok(has_table_privilege('authenticated','public.position_competencies','insert')
    and has_table_privilege('authenticated','public.position_competencies','update')
    and has_table_privilege('authenticated','public.position_competencies','delete'),
  'fixture reproduces authenticated legacy broad DML');
select ok(has_table_privilege('anon','public.position_competencies','insert')
    and has_table_privilege('anon','public.position_competencies','update')
    and has_table_privilege('anon','public.position_competencies','delete'),
  'fixture reproduces anon legacy broad DML');
revoke insert, update, delete, truncate, trigger, maintain
  on table public.position_competencies from anon, authenticated;
select ok(not has_table_privilege('authenticated','public.position_competencies','insert')
    and not has_table_privilege('authenticated','public.position_competencies','update')
    and not has_table_privilege('authenticated','public.position_competencies','delete')
    and not has_table_privilege('authenticated','public.position_competencies','truncate')
    and not has_table_privilege('authenticated','public.position_competencies','trigger')
    and not has_table_privilege('authenticated','public.position_competencies','maintain'),
  '0108 closure removes every authenticated mutation-capable table privilege');
select ok(not has_table_privilege('anon','public.position_competencies','insert')
    and not has_table_privilege('anon','public.position_competencies','update')
    and not has_table_privilege('anon','public.position_competencies','delete')
    and not has_table_privilege('anon','public.position_competencies','truncate')
    and not has_table_privilege('anon','public.position_competencies','trigger')
    and not has_table_privilege('anon','public.position_competencies','maintain'),
  '0108 closure removes every anon mutation-capable table privilege');

insert into auth.users (id,email) values
  ('a8000000-0000-4000-8000-000000000001','owner-a-pc@example.com'),
  ('a8000000-0000-4000-8000-000000000002','manager-a-pc@example.com'),
  ('a8000000-0000-4000-8000-000000000003','owner-b-pc@example.com');
insert into public.companies (id,name,slug) values
  ('a8000000-0000-4000-8000-000000000101','PC Alpha','pc-alpha'),
  ('a8000000-0000-4000-8000-000000000102','PC Beta','pc-beta');
insert into public.company_members (id,company_id,user_id,role,status) values
  ('a8000000-0000-4000-8000-000000000111','a8000000-0000-4000-8000-000000000101','a8000000-0000-4000-8000-000000000001','owner','active'),
  ('a8000000-0000-4000-8000-000000000112','a8000000-0000-4000-8000-000000000101','a8000000-0000-4000-8000-000000000002','manager','active'),
  ('a8000000-0000-4000-8000-000000000113','a8000000-0000-4000-8000-000000000102','a8000000-0000-4000-8000-000000000003','owner','active');
insert into public.positions (id,company_id,name) values
  ('a8000000-0000-4000-8000-000000000201','a8000000-0000-4000-8000-000000000101','Alpha Position'),
  ('a8000000-0000-4000-8000-000000000202','a8000000-0000-4000-8000-000000000102','Beta Position');
insert into public.competencies (id,company_id,name,category,expected_level,weight,active) values
  ('a8000000-0000-4000-8000-000000000301','a8000000-0000-4000-8000-000000000101','Alpha Skill','technical',3,1,true),
  ('a8000000-0000-4000-8000-000000000302','a8000000-0000-4000-8000-000000000101','Alpha Other','behavioral',2,2,true),
  ('a8000000-0000-4000-8000-000000000303','a8000000-0000-4000-8000-000000000102','Beta Skill','technical',3,1,true),
  ('a8000000-0000-4000-8000-000000000304','a8000000-0000-4000-8000-000000000101','Inactive Skill','technical',3,1,false);

create temporary table pc_result(id uuid);
grant select,insert on pc_result to authenticated;

set local role authenticated;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.create_tenant_position_competency_v1(
  'a8000000-0000-4000-8000-000000000101','a8000000-0000-4000-8000-000000000201',
  'a8000000-0000-4000-8000-000000000301',3,2,true,'core',null)$$,
  '42501','AUTHENTICATION_REQUIRED','unauthenticated create is denied');

select set_config('request.jwt.claims',
  '{"sub":"a8000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_position_competency_v1(
  'a8000000-0000-4000-8000-000000000101','a8000000-0000-4000-8000-000000000201',
  'a8000000-0000-4000-8000-000000000301',3,2,true,'core',null)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','manager cannot mutate');

select set_config('request.jwt.claims',
  '{"sub":"a8000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_position_competency_v1(
  'a8000000-0000-4000-8000-000000000101','a8000000-0000-4000-8000-000000000202',
  'a8000000-0000-4000-8000-000000000301',3,2,true,'core',null)$$,
  'P0002','POSITION_NOT_FOUND','cross-tenant position is rejected');
select throws_ok($$select public.create_tenant_position_competency_v1(
  'a8000000-0000-4000-8000-000000000101','a8000000-0000-4000-8000-000000000201',
  'a8000000-0000-4000-8000-000000000303',3,2,true,'core',null)$$,
  'P0002','COMPETENCY_NOT_FOUND','cross-tenant competency is rejected');
select throws_ok($$select public.create_tenant_position_competency_v1(
  'a8000000-0000-4000-8000-000000000101','a8000000-0000-4000-8000-000000000201',
  'a8000000-0000-4000-8000-000000000304',3,2,true,'core',null)$$,
  'P0002','COMPETENCY_NOT_FOUND','inactive competency is rejected');

insert into pc_result
select ((public.create_tenant_position_competency_v1(
  'a8000000-0000-4000-8000-000000000101','a8000000-0000-4000-8000-000000000201',
  'a8000000-0000-4000-8000-000000000301',4,5,false,'promotion',' Review quarterly ')
  ->>'positionCompetencyId')::uuid);

select throws_ok($$select public.create_tenant_position_competency_v1(
  'a8000000-0000-4000-8000-000000000101','a8000000-0000-4000-8000-000000000201',
  'a8000000-0000-4000-8000-000000000301',3,2,true,'core',null)$$,
  '23505','CONFLICT','duplicate active association is rejected safely');

select is((public.update_tenant_position_competency_v1(
  'a8000000-0000-4000-8000-000000000101',(select id from pc_result),
  'a8000000-0000-4000-8000-000000000201','a8000000-0000-4000-8000-000000000301',
  5,3,true,'leadership','Updated')) ->> 'status','succeeded','update succeeds');
select throws_ok(format($$select public.update_tenant_position_competency_v1(
  'a8000000-0000-4000-8000-000000000101','%s',
  'a8000000-0000-4000-8000-000000000201','a8000000-0000-4000-8000-000000000302',
  5,3,true,'leadership','Updated')$$,(select id from pc_result)),
  '22023','VALIDATION_FAILED','update cannot relink the competency');
select is((public.archive_tenant_position_competency_v1(
  'a8000000-0000-4000-8000-000000000101',(select id from pc_result))) ->> 'status',
  'succeeded','archive succeeds');
select is((public.archive_tenant_position_competency_v1(
  'a8000000-0000-4000-8000-000000000101',(select id from pc_result))) ->> 'status',
  'already_archived','archive is idempotent');
reset role;

select ok(exists(select 1 from public.position_competencies pc join pc_result r on r.id=pc.id
  where pc.company_id='a8000000-0000-4000-8000-000000000101'
    and pc.position_id='a8000000-0000-4000-8000-000000000201'
    and pc.competency_id='a8000000-0000-4000-8000-000000000301'
    and pc.expected_level=5 and pc.weight=3 and pc.required=true
    and pc.type='leadership' and pc.notes='Updated' and pc.archived_at is not null),
  'create/update/archive persist every canonical field');
select is((select active from public.competencies
  where id='a8000000-0000-4000-8000-000000000301'),true,
  'archiving the association does not archive the catalog competency');
select is((select count(*)::int from public.activity_events
  where company_id='a8000000-0000-4000-8000-000000000101'
    and activity_type in ('position_competency.created','position_competency.updated',
      'position_competency.archived')),3,'one atomic Activity exists per successful operation');

select * from finish();
rollback;
