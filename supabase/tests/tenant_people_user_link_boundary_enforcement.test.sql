begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(18);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.people'::regclass
  ),
  'RLS remains enabled on people'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'people'
      and policyname = 'members can read people in company'
      and cmd = 'SELECT'
  ),
  'People read policy remains installed'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'people'
      and policyname = 'admins and hr manage people'
      and cmd = 'ALL'
  ),
  'normal People CRUD policy remains installed'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'protect_active_membership_people_link'
      and tgrelid = 'public.people'::regclass
      and tgdeferrable
      and tginitdeferred
      and not tgisinternal
  ),
  'People identity-link protection remains deferred'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.protect_active_membership_people_link()',
    'execute'
  ),
  'authenticated cannot invoke the protection helper directly'
);

insert into auth.users (id, email, email_confirmed_at) values
  (
    '84000000-0000-4000-8000-000000000001',
    'phase8c-owner@example.com',
    now()
  ),
  (
    '84000000-0000-4000-8000-000000000002',
    'phase8c-member@example.com',
    now()
  ),
  (
    '84000000-0000-4000-8000-000000000003',
    'phase8c-other@example.com',
    now()
  );

insert into public.companies (id, name, slug) values
  (
    '84000000-0000-4000-8000-000000000101',
    'Phase 8C Alpha',
    'phase-8c-alpha'
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"84000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

insert into public.company_members (
  id,
  company_id,
  user_id,
  role,
  status
) values (
  '84000000-0000-4000-8000-000000000111',
  '84000000-0000-4000-8000-000000000101',
  '84000000-0000-4000-8000-000000000001',
  'owner',
  'active'
);

-- FK-valid but UNtrusted actor for the negative link tests: user3 has a same-tenant
-- membership (so people_company_user_membership_fkey passes and the 8C trigger is
-- actually reached), but no accepted invitation / accepted_by / trusted-acceptance
-- state. Inactive + non-owner so it disturbs no invariant. user2 stays reserved for
-- the real accept regression below.
insert into public.company_members (
  id,
  company_id,
  user_id,
  role,
  status
) values (
  '84000000-0000-4000-8000-000000000113',
  '84000000-0000-4000-8000-000000000101',
  '84000000-0000-4000-8000-000000000003',
  'employee',
  'inactive'
);

insert into public.people (
  id,
  company_id,
  user_id,
  full_name,
  email,
  status
) values (
  '84000000-0000-4000-8000-000000000201',
  '84000000-0000-4000-8000-000000000101',
  '84000000-0000-4000-8000-000000000001',
  'Phase 8C Owner',
  'phase8c-owner@example.com',
  'active'
);

insert into public.people (
  id,
  company_id,
  full_name,
  email,
  status
) values (
  '84000000-0000-4000-8000-000000000202',
  '84000000-0000-4000-8000-000000000101',
  'Phase 8C Candidate',
  'phase8c-member@example.com',
  'active'
);

set constraints protect_active_membership_people_link immediate;

select throws_ok(
  $$update public.people
    set user_id = '84000000-0000-4000-8000-000000000003'
    where id = '84000000-0000-4000-8000-000000000202'$$,
  '42501',
  'PEOPLE_USER_LINK_REQUIRES_TRUSTED_ACCEPTANCE',
  'People user_id cannot be established outside trusted invitation acceptance'
);

select is(
  (
    select user_id
    from public.people
    where id = '84000000-0000-4000-8000-000000000202'
  ),
  null::uuid,
  'rejected direct link leaves People unlinked'
);

select lives_ok(
  $$update public.people
    set full_name = 'Phase 8C Candidate Updated'
    where id = '84000000-0000-4000-8000-000000000202'$$,
  'ordinary People update remains allowed'
);

select is(
  (
    select full_name
    from public.people
    where id = '84000000-0000-4000-8000-000000000202'
  ),
  'Phase 8C Candidate Updated',
  'ordinary People update persists'
);

select throws_ok(
  $$update public.people
    set user_id = '84000000-0000-4000-8000-000000000003'
    where id = '84000000-0000-4000-8000-000000000201'$$,
  '42501',
  'PEOPLE_USER_LINK_REQUIRES_TRUSTED_ACCEPTANCE',
  'existing People identity link cannot be replaced generically'
);

select is(
  (
    select user_id
    from public.people
    where id = '84000000-0000-4000-8000-000000000201'
  ),
  '84000000-0000-4000-8000-000000000001'::uuid,
  'rejected replacement preserves the existing identity link'
);

select is(
  (
    select count(*)
    from pg_proc
    where oid =
      'public.accept_company_member_invitation_v1(text,text,uuid)'::regprocedure
      and prosecdef
  ),
  1::bigint,
  'trusted invitation acceptance RPC remains SECURITY DEFINER'
);

-- ---------------------------------------------------------------------------
-- C. REAL trusted acceptance. The boundary that blocks a generic NULL -> user_id
--    UPDATE must still ALLOW the link the genuine accept RPC establishes. We run
--    the real issue + accept RPCs (no fabricated path) with the 8C trigger active
--    and immediate, so the trigger validates the acceptance state synchronously.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"84000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.issue_company_member_invitation_v1(
      '84000000-0000-4000-8000-000000000101',
      '84000000-0000-4000-8000-000000000202',
      'phase8c-member@example.com', 'employee',
      repeat('a', 64), 'issue-8c',
      '84000000-0000-4000-8000-000000000301')$$,
  'owner issues a real invitation for the candidate Person');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"84000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$select public.accept_company_member_invitation_v1(
      repeat('a', 64), 'accept-8c',
      '84000000-0000-4000-8000-000000000302')$$,
  'the confirmed invitee accepts through the real RPC with the 8C trigger active');
reset role;

select is(
  (select status from public.company_member_invitations
   where person_id = '84000000-0000-4000-8000-000000000202'),
  'accepted', 'the invitation is marked accepted by the RPC');
select is(
  (select accepted_by_user_id from public.company_member_invitations
   where person_id = '84000000-0000-4000-8000-000000000202'),
  '84000000-0000-4000-8000-000000000002'::uuid,
  'the invitation records the accepting authenticated actor');
select is(
  (select user_id from public.people
   where id = '84000000-0000-4000-8000-000000000202'),
  '84000000-0000-4000-8000-000000000002'::uuid,
  'trusted acceptance establishes the People identity link the 8C boundary permits');
select ok(
  exists(select 1 from public.company_members
    where company_id = '84000000-0000-4000-8000-000000000101'
      and user_id = '84000000-0000-4000-8000-000000000002'
      and role = 'employee' and status = 'active'),
  'acceptance creates the active membership that backs the link');

-- ---------------------------------------------------------------------------
-- D. Legitimate atomic unlink (removal path). This is NOT re-proven here to avoid
--    duplication and an authenticated read of company_members (which has no direct
--    grant). It is covered by the canonical regression in
--    tenant_access_trusted_persistence.test.sql, whose deactivate asserts
--    (membership -> 'inactive'; people.user_id -> NULL) run in the full suite with
--    migration 0078 applied, confirming the 8C trigger does not break the trusted
--    atomic unlink.
-- ---------------------------------------------------------------------------

select * from finish();

rollback;
