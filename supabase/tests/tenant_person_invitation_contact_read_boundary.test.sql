begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(27);

select has_function(
  'public',
  'get_tenant_person_invitation_contact_v1',
  array['uuid', 'uuid']
);
select is(
  (select prosecdef from pg_proc where oid =
    'public.get_tenant_person_invitation_contact_v1(uuid,uuid)'::regprocedure),
  true,
  'contact boundary is SECURITY DEFINER'
);
select is(
  (select provolatile from pg_proc where oid =
    'public.get_tenant_person_invitation_contact_v1(uuid,uuid)'::regprocedure),
  's'::"char",
  'contact boundary is STABLE'
);
select is(
  (select proconfig from pg_proc where oid =
    'public.get_tenant_person_invitation_contact_v1(uuid,uuid)'::regprocedure),
  array['search_path=public, pg_temp']::text[],
  'search_path is hardened'
);
select is(
  (select pg_get_userbyid(proowner) from pg_proc where oid =
    'public.get_tenant_person_invitation_contact_v1(uuid,uuid)'::regprocedure),
  'postgres',
  'trusted contact boundary is owned by postgres'
);
select ok(has_function_privilege(
  'authenticated',
  'public.get_tenant_person_invitation_contact_v1(uuid,uuid)',
  'execute'
), 'authenticated can execute the contact boundary');
select ok(not has_function_privilege(
  'anon',
  'public.get_tenant_person_invitation_contact_v1(uuid,uuid)',
  'execute'
), 'anon cannot execute the contact boundary');
select ok(not has_function_privilege(
  'service_role',
  'public.get_tenant_person_invitation_contact_v1(uuid,uuid)',
  'execute'
), 'service_role has no human contact-read authority');
select ok(not has_function_privilege(
  'public',
  'public.get_tenant_person_invitation_contact_v1(uuid,uuid)',
  'execute'
), 'PUBLIC cannot execute the contact boundary');
select ok(not has_table_privilege(
  'authenticated', 'public.people', 'select'
), 'authenticated still cannot SELECT people directly');
select is(
  (select proargnames from pg_proc where oid =
    'public.get_tenant_person_invitation_contact_v1(uuid,uuid)'::regprocedure),
  array['p_company_id', 'p_person_id', 'person_id', 'email']::text[],
  'input and return column names are exact'
);
select is(
  (select proargmodes from pg_proc where oid =
    'public.get_tenant_person_invitation_contact_v1(uuid,uuid)'::regprocedure),
  array['i', 'i', 't', 't']::"char"[],
  'two inputs and two table columns are exposed'
);
select is(
  (select array_agg(format_type(type_oid, null) order by ordinal)
   from (
     select type_oid, ordinal
     from pg_proc p,
       unnest(p.proallargtypes) with ordinality as argument(type_oid, ordinal)
     where p.oid =
       'public.get_tenant_person_invitation_contact_v1(uuid,uuid)'::regprocedure
   ) as argument_types),
  array['uuid', 'uuid', 'uuid', 'text']::text[],
  'input and return types are exact'
);
select ok(not (
  (select proargnames from pg_proc where oid =
    'public.get_tenant_person_invitation_contact_v1(uuid,uuid)'::regprocedure)
  && array[
    'user_id', 'membership_id', 'role', 'name', 'phone', 'token',
    'token_digest', 'invitation_id', 'actor_id', 'correlation_id',
    'idempotency_key', 'created_at', 'updated_at'
  ]::text[]
), 'contract excludes Auth, membership, secret, identity and audit fields');

insert into auth.users (id, email, email_confirmed_at) values
  ('82000000-0000-4000-8000-000000000001', 'contact-owner-a@example.com', now()),
  ('82000000-0000-4000-8000-000000000002', 'contact-admin-a@example.com', now()),
  ('82000000-0000-4000-8000-000000000003', 'contact-hr-a@example.com', now()),
  ('82000000-0000-4000-8000-000000000004', 'contact-manager-a@example.com', now()),
  ('82000000-0000-4000-8000-000000000005', 'contact-employee-a@example.com', now()),
  ('82000000-0000-4000-8000-000000000006', 'contact-inactive-admin-a@example.com', now()),
  ('82000000-0000-4000-8000-000000000007', 'contact-owner-b@example.com', now());

insert into public.companies (id, name, slug) values
  ('82000000-0000-4000-8000-000000000101', 'Contact Alpha', 'contact-alpha'),
  ('82000000-0000-4000-8000-000000000102', 'Contact Beta', 'contact-beta');

insert into public.company_members
  (id, company_id, user_id, role, status) values
  ('82000000-0000-4000-8000-000000000111', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('82000000-0000-4000-8000-000000000112', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000002', 'admin', 'active'),
  ('82000000-0000-4000-8000-000000000113', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000003', 'hr', 'active'),
  ('82000000-0000-4000-8000-000000000114', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000004', 'manager', 'active'),
  ('82000000-0000-4000-8000-000000000115', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000005', 'employee', 'active'),
  ('82000000-0000-4000-8000-000000000116', '82000000-0000-4000-8000-000000000101', '82000000-0000-4000-8000-000000000006', 'admin', 'inactive'),
  ('82000000-0000-4000-8000-000000000117', '82000000-0000-4000-8000-000000000102', '82000000-0000-4000-8000-000000000007', 'owner', 'active');

insert into public.people
  (id, company_id, full_name, email, status) values
  ('82000000-0000-4000-8000-000000000201', '82000000-0000-4000-8000-000000000101', 'Contact Target', 'target@example.com', 'active'),
  ('82000000-0000-4000-8000-000000000202', '82000000-0000-4000-8000-000000000101', 'No Email Target', null, 'active'),
  ('82000000-0000-4000-8000-000000000203', '82000000-0000-4000-8000-000000000102', 'Foreign Target', 'foreign@example.com', 'active');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"82000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select * from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000201')$$,
  'active owner can read the tenant Person contact'
);
select results_eq(
  $$select person_id, email from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000201')$$,
  $$values (
    '82000000-0000-4000-8000-000000000201'::uuid,
    'target@example.com'::text)$$,
  'authorized Person returns only the persisted id and email'
);
select results_eq(
  $$select person_id, email from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000202')$$,
  $$values (
    '82000000-0000-4000-8000-000000000202'::uuid,
    null::text)$$,
  'missing email is returned as persisted without duplicating issue eligibility'
);
select set_config('request.jwt.claims',
  '{"sub":"82000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$select * from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000201')$$,
  'active admin can read the tenant Person contact'
);

select set_config('request.jwt.claims',
  '{"sub":"82000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000201')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'hr is denied'
);
select set_config('request.jwt.claims',
  '{"sub":"82000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000201')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'manager is denied'
);
select set_config('request.jwt.claims',
  '{"sub":"82000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000201')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'employee is denied'
);
select set_config('request.jwt.claims',
  '{"sub":"82000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000201')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'inactive admin is denied'
);

select set_config('request.jwt.claims',
  '{"sub":"82000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000102',
    '82000000-0000-4000-8000-000000000203')$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED',
  'owner cannot select a foreign tenant'
);
select throws_ok(
  $$select * from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000203')$$,
  'P0002', 'TENANT_PERSON_NOT_FOUND',
  'foreign Person id is indistinguishable from a missing Person'
);
select throws_ok(
  $$select * from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000299')$$,
  'P0002', 'TENANT_PERSON_NOT_FOUND', 'missing Person fails closed'
);
reset role;

set local role anon;
select throws_ok(
  $$select * from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000201')$$,
  '42501', null, 'anon cannot execute the contact boundary'
);
reset role;

select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  $$select * from public.get_tenant_person_invitation_contact_v1(
    '82000000-0000-4000-8000-000000000101',
    '82000000-0000-4000-8000-000000000201')$$,
  '42501', 'AUTHENTICATION_REQUIRED',
  'missing auth.uid is rejected explicitly'
);

select * from finish();
rollback;
