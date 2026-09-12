begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select plan(22);

select has_table('public', 'activity_events', 'activity audit table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.activity_events'::regclass),
  'RLS remains enabled'
);
select is(
  (select count(*)::integer from pg_policies
    where schemaname = 'public' and tablename = 'activity_events'),
  2,
  'both existing activity policies remain'
);
select has_function(
  'public', 'get_tenant_activity_timeline_v1', array['uuid', 'integer'],
  'canonical company timeline remains'
);
select ok(
  has_function_privilege(
    'authenticated', 'public.get_tenant_activity_timeline_v1(uuid,integer)', 'execute'
  ),
  'authenticated keeps canonical timeline execute'
);
select ok(
  (select prosecdef from pg_proc
    where oid = 'public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure),
  'canonical timeline remains SECURITY DEFINER'
);
select ok(
  pg_get_functiondef(
    'public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure
  ) like '%visibility=''company''%',
  'canonical timeline remains company-only'
);
select has_function(
  'public', 'get_tenant_entity_activity_timeline_v1',
  array['uuid', 'text', 'uuid', 'integer'],
  'entity timeline remains available'
);

-- Reproduce the Review-only defect explicitly. The test never depends on the
-- bootstrap's default ACL, and the transaction rollback restores all grants.
select set_config(
  'e5r1d.service_select_before',
  has_table_privilege('service_role', 'public.activity_events', 'select')::text,
  true
);
grant select, insert, update, delete, truncate, references, trigger, maintain
  on table public.activity_events to public, anon, authenticated;
select ok(
  has_table_privilege('authenticated', 'public.activity_events', 'select'),
  'fixture reproduces broad authenticated SELECT'
);
select ok(
  has_table_privilege('anon', 'public.activity_events', 'select'),
  'fixture reproduces broad anon SELECT'
);
select ok(
  exists(
    select 1
      from pg_class relation
      cross join lateral aclexplode(relation.relacl) acl
     where relation.oid = 'public.activity_events'::regclass
       and acl.grantee = 0
       and acl.privilege_type = 'SELECT'
  ),
  'fixture reproduces PUBLIC SELECT'
);

revoke select, insert, update, delete, truncate, references, trigger, maintain
  on table public.activity_events from public, anon, authenticated;

select ok(
  not has_table_privilege('authenticated', 'public.activity_events', 'select'),
  'authenticated direct SELECT is closed'
);
select ok(
  not has_table_privilege('anon', 'public.activity_events', 'select'),
  'anon direct SELECT is closed'
);
select ok(
  not exists(
    select 1
      from pg_class relation
      cross join lateral aclexplode(relation.relacl) acl
     where relation.oid = 'public.activity_events'::regclass
       and acl.grantee = 0
       and acl.privilege_type = 'SELECT'
  ),
  'PUBLIC direct SELECT is closed'
);
select is(
  (
    select count(*)::integer
      from unnest(array['anon', 'authenticated']) role_name,
           unnest(array['select', 'insert', 'update', 'delete', 'truncate']) privilege_name
     where has_table_privilege(
       role_name, 'public.activity_events', privilege_name
     )
  ),
  0,
  'client roles have no direct read or mutation privilege'
);
select is(
  has_table_privilege('service_role', 'public.activity_events', 'select')::text,
  current_setting('e5r1d.service_select_before'),
  'service_role posture is preserved exactly'
);

set local role authenticated;
select throws_ok(
  $$select * from public.activity_events limit 0$$,
  '42501',
  'permission denied for table activity_events',
  'authenticated direct read fails at the table privilege boundary'
);
reset role;
set local role anon;
select throws_ok(
  $$select * from public.activity_events limit 0$$,
  '42501',
  'permission denied for table activity_events',
  'anon direct read fails at the table privilege boundary'
);
reset role;

insert into auth.users(id, email)
values ('89000000-0000-4000-8000-000000000001', 'e5-r1d@example.com');
insert into public.companies(id, name, slug)
values ('89000000-0000-4000-8000-000000000101', 'E5 R1D', 'e5-r1d');
insert into public.company_members(id, company_id, user_id, role, status)
values (
  '89000000-0000-4000-8000-000000000201',
  '89000000-0000-4000-8000-000000000101',
  '89000000-0000-4000-8000-000000000001',
  'owner',
  'active'
);
insert into public.activity_events(
  id, company_id, activity_type, module, title, visibility, occurred_at
) values
  (
    '89000000-0000-4000-8000-000000000301',
    '89000000-0000-4000-8000-000000000101',
    'e5r1d.company', 'test', 'Company event', 'company', '2026-09-12'
  ),
  (
    '89000000-0000-4000-8000-000000000302',
    '89000000-0000-4000-8000-000000000101',
    'e5r1d.restricted', 'feedback', 'Restricted event', 'restricted', '2026-09-13'
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"89000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;
select is(
  (select count(*) from public.get_tenant_activity_timeline_v1(
    '89000000-0000-4000-8000-000000000101', 20
  )),
  1::bigint,
  'canonical timeline remains usable'
);
select is(
  (select title from public.get_tenant_activity_timeline_v1(
    '89000000-0000-4000-8000-000000000101', 20
  )),
  'Company event',
  'restricted audit remains excluded from the general timeline'
);
reset role;

select ok(
  not has_table_privilege('authenticated', 'public.activity_events', 'insert'),
  'authenticated direct INSERT is closed'
);
select ok(
  not has_table_privilege('anon', 'public.activity_events', 'insert'),
  'anon direct INSERT is closed'
);

select * from finish();
rollback;
