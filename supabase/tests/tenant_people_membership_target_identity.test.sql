begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(27);

select has_function('public', 'get_people_access_state_v2', array['uuid']);
select is((select prosecdef from pg_proc where oid =
  'public.get_people_access_state_v2(uuid)'::regprocedure), true,
  'V2 is SECURITY DEFINER');
select is((select provolatile from pg_proc where oid =
  'public.get_people_access_state_v2(uuid)'::regprocedure), 's'::"char",
  'V2 is STABLE');
select is((select proconfig from pg_proc where oid =
  'public.get_people_access_state_v2(uuid)'::regprocedure),
  array['search_path=public, pg_temp']::text[], 'V2 search_path is hardened');
select ok(has_function_privilege('authenticated',
  'public.get_people_access_state_v2(uuid)', 'execute'),
  'authenticated can execute V2');
select ok(not has_function_privilege('anon',
  'public.get_people_access_state_v2(uuid)', 'execute'),
  'anon cannot execute V2');
select ok(not has_function_privilege('service_role',
  'public.get_people_access_state_v2(uuid)', 'execute'),
  'service_role has no human V2 authority');
select ok(not has_function_privilege('public',
  'public.get_people_access_state_v2(uuid)', 'execute'),
  'PUBLIC cannot execute V2');
select is((select proargnames[2:10] from pg_proc where oid =
  'public.get_people_access_state_v2(uuid)'::regprocedure), array[
    'person_id', 'membership_id', 'membership_role', 'membership_status',
    'invitation_id', 'invitation_role', 'invitation_status',
    'invitation_generation', 'invitation_expires_at']::text[],
  'V2 return column names are exact');
select is((select array_agg(format_type(type_oid, null) order by ordinal)
  from (select type_oid, ordinal from pg_proc p,
    unnest(p.proallargtypes) with ordinality as t(type_oid, ordinal)
    where p.oid = 'public.get_people_access_state_v2(uuid)'::regprocedure
      and ordinal > 1) as output_types),
  array['uuid','uuid','text','text','uuid','text','text','integer','timestamp with time zone']::text[],
  'V2 return column types are exact');
select ok(not ((select proargnames from pg_proc where oid =
  'public.get_people_access_state_v2(uuid)'::regprocedure) && array[
    'company_id','membership_user_id','user_id','target_email_normalized',
    'token_digest','created_by_actor_user_id','accepted_by_user_id',
    'revoked_by_actor_user_id','created_operation_id','correlation_id',
    'idempotency_key','intent_fingerprint']::text[]),
  'V2 excludes secrets, Auth IDs and operational IDs');
select ok(not has_table_privilege('authenticated',
  'public.company_members', 'select'),
  'company_members remains closed to authenticated SELECT');
select ok(not has_table_privilege('authenticated',
  'public.company_member_invitations', 'select'),
  'invitations remain closed to authenticated SELECT');
select is((select count(*) from pg_policies where schemaname = 'public'
  and tablename = 'company_members'), 1::bigint,
  'no company_members policy was added');
select is((select count(*) from pg_policies where schemaname = 'public'
  and tablename = 'company_member_invitations'), 0::bigint,
  'no invitation policy was added');

insert into auth.users (id, email, email_confirmed_at) values
  ('80000000-0000-4000-8000-000000000001','target-owner-a@example.com',now()),
  ('80000000-0000-4000-8000-000000000002','target-admin-a@example.com',now()),
  ('80000000-0000-4000-8000-000000000003','target-hr-a@example.com',now()),
  ('80000000-0000-4000-8000-000000000004','target-manager-a@example.com',now()),
  ('80000000-0000-4000-8000-000000000005','target-employee-a@example.com',now()),
  ('80000000-0000-4000-8000-000000000006','target-inactive-a@example.com',now()),
  ('80000000-0000-4000-8000-000000000007','target-owner-b@example.com',now());

insert into public.companies (id, name, slug) values
  ('80000000-0000-4000-8000-000000000101','Target Alpha','target-alpha'),
  ('80000000-0000-4000-8000-000000000102','Target Beta','target-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('80000000-0000-4000-8000-000000000111','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000001','owner','active'),
  ('80000000-0000-4000-8000-000000000112','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000002','admin','active'),
  ('80000000-0000-4000-8000-000000000113','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000003','hr','active'),
  ('80000000-0000-4000-8000-000000000114','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000004','manager','active'),
  ('80000000-0000-4000-8000-000000000115','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000005','employee','active'),
  ('80000000-0000-4000-8000-000000000116','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000006','admin','inactive'),
  ('80000000-0000-4000-8000-000000000117','80000000-0000-4000-8000-000000000102','80000000-0000-4000-8000-000000000007','owner','active');

insert into public.people (id, company_id, user_id, full_name, email, status) values
  ('80000000-0000-4000-8000-000000000201','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000001','Owner A','target-owner-a@example.com','active'),
  ('80000000-0000-4000-8000-000000000202','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000002','Admin A','target-admin-a@example.com','active'),
  ('80000000-0000-4000-8000-000000000203','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000003','HR A','target-hr-a@example.com','active'),
  ('80000000-0000-4000-8000-000000000204','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000004','Manager A','target-manager-a@example.com','active'),
  ('80000000-0000-4000-8000-000000000205','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000005','Employee A','target-employee-a@example.com','active'),
  ('80000000-0000-4000-8000-000000000206','80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000006','Inactive A','target-inactive-a@example.com','inactive'),
  ('80000000-0000-4000-8000-000000000207','80000000-0000-4000-8000-000000000102','80000000-0000-4000-8000-000000000007','Owner B','target-owner-b@example.com','active'),
  ('80000000-0000-4000-8000-000000000208','80000000-0000-4000-8000-000000000101',null,'Candidate','target-candidate@example.com','active'),
  ('80000000-0000-4000-8000-000000000209','80000000-0000-4000-8000-000000000102',null,'Other Tenant','target-other@example.com','active');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select * from public.get_people_access_state_v2('80000000-0000-4000-8000-000000000101')$$,
  'active owner can execute V2');
select lives_ok($$select public.issue_company_member_invitation_v1(
  '80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000208',
  'target-candidate@example.com','employee',repeat('8',64),'target-identity-invite',
  '80000000-0000-4000-8000-000000000301')$$,
  'owner creates invitation fixture through the trusted boundary');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select * from public.get_people_access_state_v2('80000000-0000-4000-8000-000000000101')$$,
  'active admin can execute V2');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select * from public.get_people_access_state_v2('80000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','hr is denied');
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select * from public.get_people_access_state_v2('80000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','manager is denied');
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select * from public.get_people_access_state_v2('80000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','employee is denied');
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select * from public.get_people_access_state_v2('80000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','inactive admin is denied');
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select membership_id from public.get_people_access_state_v2('80000000-0000-4000-8000-000000000101') where person_id='80000000-0000-4000-8000-000000000202'),
  '80000000-0000-4000-8000-000000000112'::uuid,'active membership projects its exact ID');
select is((select membership_id from public.get_people_access_state_v2('80000000-0000-4000-8000-000000000101') where person_id='80000000-0000-4000-8000-000000000206'),
  '80000000-0000-4000-8000-000000000116'::uuid,'inactive membership projects its exact ID');
select is((select membership_id from public.get_people_access_state_v2('80000000-0000-4000-8000-000000000101') where person_id='80000000-0000-4000-8000-000000000208'),
  null::uuid,'Person without membership projects null membership ID');
select ok(not exists(select 1 from public.get_people_access_state_v2('80000000-0000-4000-8000-000000000101')
  where membership_id='80000000-0000-4000-8000-000000000117'),
  'foreign tenant membership ID never appears');
select is(
  (select row(membership_role,membership_status,invitation_id,invitation_role,
    invitation_status,invitation_generation,invitation_expires_at)::text
   from public.get_people_access_state_v1('80000000-0000-4000-8000-000000000101')
   where person_id='80000000-0000-4000-8000-000000000208'),
  (select row(membership_role,membership_status,invitation_id,invitation_role,
    invitation_status,invitation_generation,invitation_expires_at)::text
   from public.get_people_access_state_v2('80000000-0000-4000-8000-000000000101')
   where person_id='80000000-0000-4000-8000-000000000208'),
  'V2 preserves the existing safe invitation projection');
reset role;

select * from finish();
rollback;
