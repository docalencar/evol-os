begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select plan(17);

select has_function('public', 'get_tenant_entity_activity_timeline_v1', array['uuid', 'text', 'uuid', 'integer']);
select is(
  (select proargnames from pg_proc where oid = 'public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure),
  array['p_company_id','p_entity_type','p_entity_id','p_limit','activity_id','activity_type','module','title','description','actor_type','entity_type','entity_id','occurred_at','created_at']::text[],
  'signature and return shape remain unchanged'
);
select ok(
  (select prosecdef and provolatile = 's' and proconfig = array['search_path=public, pg_temp']::text[]
   from pg_proc where oid = 'public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure),
  'function remains STABLE SECURITY DEFINER with hardened search_path'
);

insert into auth.users(id, email, email_confirmed_at) values
  ('86000000-0000-4000-8000-000000000001', 'timeline-owner@example.com', now());
insert into public.companies(id, name, slug) values
  ('86000000-0000-4000-8000-000000000101', 'Timeline Alpha', 'timeline-alpha'),
  ('86000000-0000-4000-8000-000000000102', 'Timeline Foreign', 'timeline-foreign');
insert into public.company_members(id, company_id, user_id, role, status) values
  ('86000000-0000-4000-8000-000000000111', '86000000-0000-4000-8000-000000000101', '86000000-0000-4000-8000-000000000001', 'owner', 'active');

insert into public.activity_events(
  id, company_id, activity_type, module, title, actor_id,
  entity_type, entity_id, subject_type, subject_id, visibility, metadata,
  occurred_at, created_at
) values
  ('86000000-0000-4000-8000-000000000201','86000000-0000-4000-8000-000000000101','employee.created','people','Employee entity',null,'employee','86000000-0000-4000-8000-000000000301','employee','86000000-0000-4000-8000-000000000301','company','{"private":"hidden"}','2024-01-01','2024-01-01'),
  ('86000000-0000-4000-8000-000000000202','86000000-0000-4000-8000-000000000101','person.future','people','Person entity',null,'person','86000000-0000-4000-8000-000000000301','person','86000000-0000-4000-8000-000000000301','company','{}','2024-02-01','2024-02-01'),
  ('86000000-0000-4000-8000-000000000203','86000000-0000-4000-8000-000000000101','feedback.created','feedback','Employee subject',null,'feedback_thread','86000000-0000-4000-8000-000000000401','employee','86000000-0000-4000-8000-000000000301','company','{}','2024-03-01','2024-03-01'),
  ('86000000-0000-4000-8000-000000000204','86000000-0000-4000-8000-000000000101','employee.secret','people','Restricted',null,'employee','86000000-0000-4000-8000-000000000301','employee','86000000-0000-4000-8000-000000000301','restricted','{}','2024-04-01','2024-04-01'),
  ('86000000-0000-4000-8000-000000000205','86000000-0000-4000-8000-000000000101','department.updated','organization','Department',null,'department','86000000-0000-4000-8000-000000000501',null,null,'company','{}','2024-01-01','2024-01-01'),
  ('86000000-0000-4000-8000-000000000206','86000000-0000-4000-8000-000000000101','team.updated','organization','Team',null,'team','86000000-0000-4000-8000-000000000502',null,null,'company','{}','2024-01-01','2024-01-01'),
  ('86000000-0000-4000-8000-000000000207','86000000-0000-4000-8000-000000000101','position.updated','organization','Position',null,'position','86000000-0000-4000-8000-000000000503',null,null,'company','{}','2024-01-01','2024-01-01'),
  ('86000000-0000-4000-8000-000000000208','86000000-0000-4000-8000-000000000102','employee.foreign','people','Foreign',null,'employee','86000000-0000-4000-8000-000000000301','employee','86000000-0000-4000-8000-000000000301','company','{}','2024-05-01','2024-05-01');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"86000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is((select count(*) from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000101','person','86000000-0000-4000-8000-000000000301',20)), 3::bigint, 'person finds employee entity, person entity and employee subject');
select results_eq(
  $$select title from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000101','person','86000000-0000-4000-8000-000000000301',20)$$,
  $$values ('Employee subject'), ('Person entity'), ('Employee entity')$$,
  'person ordering is deterministic'
);
select is((select count(distinct entity_type) from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000101','person','86000000-0000-4000-8000-000000000301',20) where entity_type = 'person'), 1::bigint, 'person output entity type is normalized');
select is((select count(distinct entity_id) from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000101','person','86000000-0000-4000-8000-000000000301',20) where entity_id = '86000000-0000-4000-8000-000000000301'), 1::bigint, 'person output entity id is normalized');
select is((select count(*) from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000101','person','86000000-0000-4000-8000-000000000301',20) where title = 'Restricted'), 0::bigint, 'restricted activity remains excluded');
select is((select title from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000101','department','86000000-0000-4000-8000-000000000501',20)), 'Department', 'department behavior is unchanged');
select is((select title from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000101','team','86000000-0000-4000-8000-000000000502',20)), 'Team', 'team behavior is unchanged');
select is((select title from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000101','position','86000000-0000-4000-8000-000000000503',20)), 'Position', 'position behavior is unchanged');
select is((select count(*) from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000101','person','86000000-0000-4000-8000-000000000999',20)), 0::bigint, 'unknown person returns no rows');
select throws_ok($$select * from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000102','person','86000000-0000-4000-8000-000000000301',20)$$, '42501', 'TENANT_AUTHORIZATION_DENIED', 'foreign tenant is denied');
select throws_ok($$select * from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000101','employee','86000000-0000-4000-8000-000000000301',20)$$, '22023', 'ACTIVITY_ENTITY_TYPE_INVALID', 'external employee selector remains invalid');
select throws_ok($$select * from public.get_tenant_entity_activity_timeline_v1('86000000-0000-4000-8000-000000000101','person','86000000-0000-4000-8000-000000000301',0)$$, '22023', 'ACTIVITY_LIMIT_OUT_OF_RANGE', 'limit validation is unchanged');
select ok(array_position((select proargnames from pg_proc where oid = 'public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure), 'actor_id') is null, 'actor_id remains absent');
select ok(array_position((select proargnames from pg_proc where oid = 'public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)'::regprocedure), 'metadata') is null, 'metadata remains absent');

reset role;
select * from finish();
rollback;
