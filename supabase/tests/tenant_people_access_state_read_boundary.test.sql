begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(37);

select has_function('public', 'get_people_access_state_v1', array['uuid']);
select is((select prosecdef from pg_proc where oid =
  'public.get_people_access_state_v1(uuid)'::regprocedure), true,
  'read boundary is SECURITY DEFINER');
select is((select provolatile from pg_proc where oid =
  'public.get_people_access_state_v1(uuid)'::regprocedure), 's'::"char",
  'read boundary is STABLE');
select is((select proconfig from pg_proc where oid =
  'public.get_people_access_state_v1(uuid)'::regprocedure),
  array['search_path=public, pg_temp']::text[], 'search_path is hardened');
select is((select pg_get_userbyid(proowner) from pg_proc where oid =
  'public.get_people_access_state_v1(uuid)'::regprocedure), 'postgres',
  'trusted read boundary is owned by postgres');
select ok(has_function_privilege('authenticated',
  'public.get_people_access_state_v1(uuid)', 'execute'),
  'authenticated can execute the read boundary');
select ok(not has_function_privilege('anon',
  'public.get_people_access_state_v1(uuid)', 'execute'),
  'anon cannot execute the read boundary');
select ok(not has_function_privilege('service_role',
  'public.get_people_access_state_v1(uuid)', 'execute'),
  'service_role has no human read-boundary authority');
select ok(not has_function_privilege('public',
  'public.get_people_access_state_v1(uuid)', 'execute'),
  'PUBLIC cannot execute the read boundary');
select ok(not has_table_privilege('authenticated',
  'public.company_member_invitations', 'select'),
  'authenticated still cannot SELECT invitations');
select ok(not has_table_privilege('anon',
  'public.company_member_invitations', 'select'),
  'anon still cannot SELECT invitations');
select is((select count(*) from pg_policies where schemaname = 'public'
  and tablename = 'company_member_invitations' and cmd = 'SELECT'), 0::bigint,
  'no invitation SELECT policy exists');
select is((select proargnames[2:9] from pg_proc where oid =
  'public.get_people_access_state_v1(uuid)'::regprocedure), array[
    'person_id', 'membership_role', 'membership_status', 'invitation_id',
    'invitation_role', 'invitation_status', 'invitation_generation',
    'invitation_expires_at']::text[], 'return column names are exact');
select is((select array_agg(format_type(type_oid, null) order by ordinal)
  from (select type_oid, ordinal from pg_proc p,
    unnest(p.proallargtypes) with ordinality as t(type_oid, ordinal)
    where p.oid = 'public.get_people_access_state_v1(uuid)'::regprocedure
      and ordinal > 1) as output_types),
  array['uuid','text','text','uuid','text','text','integer','timestamp with time zone']::text[],
  'return column types are exact');
select ok(not ((select proargnames from pg_proc where oid =
  'public.get_people_access_state_v1(uuid)'::regprocedure) && array[
    'company_id','target_email_normalized','token_digest','created_by_actor_user_id',
    'accepted_by_user_id','revoked_by_actor_user_id','created_operation_id',
    'correlation_id','idempotency_key','intent_fingerprint','user_id']::text[]),
  'return shape excludes secrets, operational IDs and Auth IDs');

insert into auth.users (id, email, email_confirmed_at) values
  ('79000000-0000-4000-8000-000000000001','read-owner-a@example.com',now()),
  ('79000000-0000-4000-8000-000000000002','read-admin-a@example.com',now()),
  ('79000000-0000-4000-8000-000000000003','read-hr-a@example.com',now()),
  ('79000000-0000-4000-8000-000000000004','read-manager-a@example.com',now()),
  ('79000000-0000-4000-8000-000000000005','read-employee-a@example.com',now()),
  ('79000000-0000-4000-8000-000000000006','read-inactive-a@example.com',now()),
  ('79000000-0000-4000-8000-000000000007','read-owner-b@example.com',now()),
  ('79000000-0000-4000-8000-000000000008','read-accepted-a@example.com',now());

insert into public.companies (id, name, slug) values
  ('79000000-0000-4000-8000-000000000101','Read Alpha','read-alpha'),
  ('79000000-0000-4000-8000-000000000102','Read Beta','read-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('79000000-0000-4000-8000-000000000111','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000001','owner','active'),
  ('79000000-0000-4000-8000-000000000112','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000002','admin','active'),
  ('79000000-0000-4000-8000-000000000113','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000003','hr','active'),
  ('79000000-0000-4000-8000-000000000114','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000004','manager','active'),
  ('79000000-0000-4000-8000-000000000115','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000005','employee','active'),
  ('79000000-0000-4000-8000-000000000116','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000006','admin','inactive'),
  ('79000000-0000-4000-8000-000000000117','79000000-0000-4000-8000-000000000102','79000000-0000-4000-8000-000000000007','owner','active'),
  ('79000000-0000-4000-8000-000000000118','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000008','employee','active');

insert into public.people (id, company_id, user_id, full_name, email, status) values
  ('79000000-0000-4000-8000-000000000201','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000001','Owner A','read-owner-a@example.com','active'),
  ('79000000-0000-4000-8000-000000000202','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000002','Admin A','read-admin-a@example.com','active'),
  ('79000000-0000-4000-8000-000000000203','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000003','HR A','read-hr-a@example.com','active'),
  ('79000000-0000-4000-8000-000000000204','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000004','Manager A','read-manager-a@example.com','active'),
  ('79000000-0000-4000-8000-000000000205','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000005','Employee A','read-employee-a@example.com','active'),
  ('79000000-0000-4000-8000-000000000206','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000006','Inactive A','read-inactive-a@example.com','inactive'),
  ('79000000-0000-4000-8000-000000000207','79000000-0000-4000-8000-000000000102','79000000-0000-4000-8000-000000000007','Owner B','read-owner-b@example.com','active'),
  ('79000000-0000-4000-8000-000000000208','79000000-0000-4000-8000-000000000101',null,'Pending','pending@example.com','active'),
  ('79000000-0000-4000-8000-000000000209','79000000-0000-4000-8000-000000000101',null,'Expired','expired-read@example.com','active'),
  ('79000000-0000-4000-8000-000000000210','79000000-0000-4000-8000-000000000101',null,'Revoked','revoked-read@example.com','active'),
  ('79000000-0000-4000-8000-000000000211','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000008','Accepted','read-accepted-a@example.com','active'),
  ('79000000-0000-4000-8000-000000000212','79000000-0000-4000-8000-000000000101',null,'History','history@example.com','active'),
  ('79000000-0000-4000-8000-000000000213','79000000-0000-4000-8000-000000000101',null,'No Invitation','none@example.com','on_leave'),
  ('79000000-0000-4000-8000-000000000214','79000000-0000-4000-8000-000000000101',null,'Terminated','terminated@example.com','terminated'),
  ('79000000-0000-4000-8000-000000000215','79000000-0000-4000-8000-000000000102',null,'Other Tenant','other-read@example.com','active');

insert into public.tenant_access_operations
  (id, company_id, actor_user_id, operation, idempotency_key,
   intent_fingerprint, correlation_id, status, result, completed_at)
select id, company_id, '79000000-0000-4000-8000-000000000001', 'invite_issue',
  'read-' || id::text, 'read-fixture-' || id::text, id, 'succeeded', '{}', now()
from (values
  ('79000000-0000-4000-8000-000000000301'::uuid,'79000000-0000-4000-8000-000000000101'::uuid),
  ('79000000-0000-4000-8000-000000000302','79000000-0000-4000-8000-000000000101'),
  ('79000000-0000-4000-8000-000000000303','79000000-0000-4000-8000-000000000101'),
  ('79000000-0000-4000-8000-000000000304','79000000-0000-4000-8000-000000000101'),
  ('79000000-0000-4000-8000-000000000305','79000000-0000-4000-8000-000000000101'),
  ('79000000-0000-4000-8000-000000000306','79000000-0000-4000-8000-000000000101'),
  ('79000000-0000-4000-8000-000000000307','79000000-0000-4000-8000-000000000101'),
  ('79000000-0000-4000-8000-000000000308','79000000-0000-4000-8000-000000000102')) as fixture(id, company_id);

insert into public.company_member_invitations
  (id, company_id, person_id, target_email_normalized, intended_role,
   token_digest, generation, status, expires_at, created_at,
   created_by_actor_user_id, created_operation_id, idempotency_key,
   intent_fingerprint, correlation_id, revoked_at, revoked_by_actor_user_id,
   accepted_at, accepted_by_user_id, updated_at) values
  ('79000000-0000-4000-8000-000000000401','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000208','pending@example.com','owner',decode(repeat('1',64),'hex'),3,'pending',now()+interval '2 days',now()-interval '1 day','79000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-000000000301','read-pending','pending','79000000-0000-4000-8000-000000000301',null,null,null,null,now()),
  ('79000000-0000-4000-8000-000000000402','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000209','expired-read@example.com','employee',decode(repeat('2',64),'hex'),2,'pending',now()-interval '1 day',now()-interval '8 days','79000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-000000000302','read-expired','expired','79000000-0000-4000-8000-000000000302',null,null,null,null,now()),
  ('79000000-0000-4000-8000-000000000403','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000210','revoked-read@example.com','employee',decode(repeat('3',64),'hex'),1,'revoked',now()+interval '2 days',now()-interval '1 day','79000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-000000000303','read-revoked','revoked','79000000-0000-4000-8000-000000000303',now(), '79000000-0000-4000-8000-000000000001',null,null,now()),
  ('79000000-0000-4000-8000-000000000404','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000211','read-accepted-a@example.com','employee',decode(repeat('4',64),'hex'),4,'accepted',now()+interval '2 days',now()-interval '1 day','79000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-000000000304','read-accepted','accepted','79000000-0000-4000-8000-000000000304',null,null,now(),'79000000-0000-4000-8000-000000000008',now()),
  ('79000000-0000-4000-8000-000000000405','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000212','history@example.com','employee',decode(repeat('5',64),'hex'),1,'revoked',now()+interval '2 days',now()-interval '5 days','79000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-000000000305','read-history-old','old','79000000-0000-4000-8000-000000000305',now()-interval '4 days','79000000-0000-4000-8000-000000000001',null,null,now()-interval '4 days'),
  ('79000000-0000-4000-8000-000000000406','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000212','history@example.com','admin',decode(repeat('6',64),'hex'),2,'pending',now()+interval '3 days',now()-interval '2 days','79000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-000000000306','read-history-new','new','79000000-0000-4000-8000-000000000306',null,null,null,null,now()-interval '1 day'),
  ('79000000-0000-4000-8000-000000000407','79000000-0000-4000-8000-000000000101','79000000-0000-4000-8000-000000000202','read-admin-a@example.com','owner',decode(repeat('7',64),'hex'),1,'revoked',now()+interval '2 days',now()-interval '1 day','79000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-000000000307','read-owner-visibility','owner','79000000-0000-4000-8000-000000000307',now(),'79000000-0000-4000-8000-000000000001',null,null,now()),
  ('79000000-0000-4000-8000-000000000408','79000000-0000-4000-8000-000000000102','79000000-0000-4000-8000-000000000215','other-read@example.com','employee',decode(repeat('8',64),'hex'),1,'pending',now()+interval '2 days',now()-interval '1 day','79000000-0000-4000-8000-000000000007','79000000-0000-4000-8000-000000000308','read-other','other','79000000-0000-4000-8000-000000000308',null,null,null,null,now());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"79000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select * from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101')$$,'active owner can read access state');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"79000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select * from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101')$$,'active admin can read access state');
select is((select invitation_role from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000202'),'owner','admin can see safe owner invitation status');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"79000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select * from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','hr is denied');
select set_config('request.jwt.claims','{"sub":"79000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select * from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','manager is denied');
select set_config('request.jwt.claims','{"sub":"79000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select * from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','employee is denied');
select set_config('request.jwt.claims','{"sub":"79000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select * from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101')$$,'42501','TENANT_AUTHORIZATION_DENIED','inactive admin is denied');
select set_config('request.jwt.claims','{"sub":"79000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000102')$$,'42501','TENANT_AUTHORIZATION_DENIED','foreign tenant is denied');

select is((select count(*) from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101')),12::bigint,'result contains only non-terminated People from the authorized tenant');
select is((select invitation_status from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000208'),'pending','valid pending invitation projects pending');
select is((select invitation_status from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000209'),'expired','expired pending invitation projects effective expired');
select is((select invitation_status from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000210'),'revoked','revoked invitation projects revoked');
select is((select invitation_status from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000211'),'accepted','accepted invitation projects accepted');
select ok((select invitation_generation = 3 and invitation_expires_at > now() from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000208'),'generation and expiry are projected');
select ok((select membership_role='employee' and membership_status='active' from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000211'),'active membership role and status are projected');
select ok((select membership_role='admin' and membership_status='inactive' from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000206'),'inactive membership role and status are projected');
select is((select invitation_id from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000212'),'79000000-0000-4000-8000-000000000406'::uuid,'latest deterministic invitation is selected');
select is((select count(*) from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000212'),1::bigint,'historical invitations produce one Person row');
select is((select invitation_id from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000213'),null::uuid,'Person without invitation projects null invitation facts');
select ok((select membership_status='active' and invitation_status='accepted' from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id='79000000-0000-4000-8000-000000000211'),'membership and invitation facts coexist');
select ok(not exists(select 1 from public.get_people_access_state_v1('79000000-0000-4000-8000-000000000101') where person_id in ('79000000-0000-4000-8000-000000000207','79000000-0000-4000-8000-000000000215')),'authorized result contains no foreign-tenant rows');
reset role;

select is((select status from public.company_member_invitations where id='79000000-0000-4000-8000-000000000402'),'pending','effective expiration performs no write');

select * from finish();
rollback;
