begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(24);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'people'
      and indexname = 'people_company_user_key'
      and indexdef ilike 'create unique index%'
      and indexdef ilike '%(company_id, user_id)%'
      and indexdef ilike '%where (user_id is not null)%'
  ),
  'People/Auth link is unique per tenant when user_id is present'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'people_company_user_membership_fkey'
      and convalidated
  ),
  'People to membership tenant-aware FK is validated'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'enforce_active_membership_has_people'
      and tgdeferrable
      and tginitdeferred
      and not tgisinternal
  ),
  'active membership invariant is deferred'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'protect_active_membership_people_link'
      and tgdeferrable
      and tginitdeferred
      and not tgisinternal
  ),
  'active membership People link protection is deferred'
);

insert into auth.users (id, email) values
  ('72000000-0000-4000-8000-000000000001', 'phase2-owner@example.com'),
  ('72000000-0000-4000-8000-000000000002', 'phase2-member@example.com'),
  ('72000000-0000-4000-8000-000000000003', 'phase2-other@example.com'),
  ('72000000-0000-4000-8000-000000000004', 'phase2-unlinked@example.com');

insert into public.companies (id, name, slug) values
  ('72000000-0000-4000-8000-000000000101', 'Phase 2 Complete Alpha', 'phase-2-complete-alpha'),
  ('72000000-0000-4000-8000-000000000102', 'Phase 2 Complete Beta', 'phase-2-complete-beta');

select set_config(
  'request.jwt.claims',
  '{"sub":"72000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

insert into public.company_members (company_id, user_id, role) values
  ('72000000-0000-4000-8000-000000000101', '72000000-0000-4000-8000-000000000001', 'owner');

insert into public.people (id, company_id, user_id, full_name, email) values
  (
    '72000000-0000-4000-8000-000000000201',
    '72000000-0000-4000-8000-000000000101',
    '72000000-0000-4000-8000-000000000001',
    'Owner',
    'unrelated-bootstrap@example.com'
  );

set constraints enforce_active_membership_has_people immediate;

select throws_ok(
  $$insert into public.company_members (company_id, user_id, role)
    values (
      '72000000-0000-4000-8000-000000000101',
      '72000000-0000-4000-8000-000000000004',
      'employee'
    )$$,
  '23514',
  'ACTIVE_MEMBERSHIP_REQUIRES_EXACTLY_ONE_PERSON',
  'active human membership without People is rejected'
);

set constraints enforce_active_membership_has_people deferred;

insert into public.company_members (company_id, user_id, role) values
  ('72000000-0000-4000-8000-000000000101', '72000000-0000-4000-8000-000000000002', 'employee');

insert into public.people (id, company_id, user_id, full_name) values
  (
    '72000000-0000-4000-8000-000000000202',
    '72000000-0000-4000-8000-000000000101',
    '72000000-0000-4000-8000-000000000002',
    'Member'
  );

select lives_ok(
  $$set constraints enforce_active_membership_has_people immediate$$,
  'membership and People created atomically are accepted'
);

set constraints all deferred;

select throws_ok(
  $$insert into public.people (company_id, user_id, full_name)
    values (
      '72000000-0000-4000-8000-000000000101',
      '72000000-0000-4000-8000-000000000002',
      'Duplicate'
    )$$,
  '23505',
  null,
  'duplicate People for the same tenant and user is rejected'
);

insert into public.company_members (company_id, user_id, role, status) values
  (
    '72000000-0000-4000-8000-000000000102',
    '72000000-0000-4000-8000-000000000002',
    'employee',
    'inactive'
  );

select lives_ok(
  $$insert into public.people (company_id, user_id, full_name)
    values (
      '72000000-0000-4000-8000-000000000102',
      '72000000-0000-4000-8000-000000000002',
      'Same Auth Other Tenant'
    )$$,
  'same Auth user in another tenant is allowed'
);

select lives_ok(
  $$insert into public.people (company_id, full_name)
    values ('72000000-0000-4000-8000-000000000101', 'No Auth User')$$,
  'People without user_id remains allowed'
);

set constraints people_company_user_membership_fkey immediate;

select throws_ok(
  $$insert into public.people (company_id, user_id, full_name)
    values (
      '72000000-0000-4000-8000-000000000102',
      '72000000-0000-4000-8000-000000000003',
      'No Same Tenant Membership'
    )$$,
  '23503',
  null,
  'People linked to Auth requires same-tenant membership'
);

set constraints protect_active_membership_people_link immediate;

select throws_ok(
  $$delete from public.people
    where id = '72000000-0000-4000-8000-000000000202'$$,
  '23514',
  'ACTIVE_MEMBERSHIP_REQUIRES_EXACTLY_ONE_PERSON',
  'active membership People cannot be deleted independently'
);

select throws_ok(
  $$update public.people
    set user_id = null
    where id = '72000000-0000-4000-8000-000000000202'$$,
  '23514',
  'ACTIVE_MEMBERSHIP_REQUIRES_EXACTLY_ONE_PERSON',
  'active membership People cannot be unlinked independently'
);

set constraints protect_active_membership_people_link deferred;

update public.company_members
set status = 'inactive'
where company_id = '72000000-0000-4000-8000-000000000101'
  and user_id = '72000000-0000-4000-8000-000000000002';

update public.people
set user_id = null
where id = '72000000-0000-4000-8000-000000000202';

select lives_ok(
  $$set constraints protect_active_membership_people_link immediate$$,
  'membership deactivation and People unlink are allowed atomically'
);

select is(
  (
    select count(*)
    from public.people
    where company_id = '72000000-0000-4000-8000-000000000101'
      and user_id = '72000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'owner retains exactly one same-tenant People link'
);

select is(
  (
    select role
    from public.company_members
    where company_id = '72000000-0000-4000-8000-000000000101'
      and user_id = '72000000-0000-4000-8000-000000000001'
  ),
  'owner',
  'role remains sourced from membership, not People data'
);

select isnt(
  (
    select email
    from public.people
    where id = '72000000-0000-4000-8000-000000000201'
  ),
  (
    select email
    from auth.users
    where id = '72000000-0000-4000-8000-000000000001'
  )::text,
  'People/Auth identity does not depend on email equality'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"72000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.company_members
    set status = 'inactive'
    where company_id = '72000000-0000-4000-8000-000000000101'
      and user_id = '72000000-0000-4000-8000-000000000001'$$,
  '42501',
  'OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER',
  'non-owner cannot administer owner'
);

select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);
set local role service_role;

select throws_ok(
  $$update public.company_members
    set role = 'admin'
    where company_id = '72000000-0000-4000-8000-000000000101'
      and user_id = '72000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'service role cannot become a human owner actor'
);

reset role;

select throws_ok(
  $$update public.company_members
    set role = 'admin'
    where company_id = '72000000-0000-4000-8000-000000000101'
      and user_id = '72000000-0000-4000-8000-000000000001'$$,
  '42501',
  'OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER',
  'missing human actor cannot administer owner'
);

select is(
  (select count(*) from public.company_members where status = 'invited'),
  0::bigint,
  'invited legacy status remains untouched'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'people'
      and column_name ilike '%email_identity%'
  ),
  'no email-based identity column was introduced'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"72000000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);

set constraints all deferred;

select lives_ok(
  $$select public.create_company_with_owner(
    'Phase 2 Onboarding',
    'phase-2-onboarding'
  )$$,
  'create_company_with_owner remains callable'
);

select lives_ok(
  $$set constraints all immediate$$,
  'onboarding owner membership and People satisfy deferred invariants'
);

select is(
  (
    select count(*)
    from public.company_members cm
    join public.people p
      on p.company_id = cm.company_id
      and p.user_id = cm.user_id
    where cm.user_id = '72000000-0000-4000-8000-000000000004'
      and cm.role = 'owner'
      and cm.status = 'active'
  ),
  1::bigint,
  'onboarding creates exactly one coherent active owner link'
);

select * from finish();
rollback;
