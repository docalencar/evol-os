begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(21);

grant select on public.recruitment_job_openings to authenticated;
grant select, update on public.recruitment_job_openings to service_role;

insert into auth.users (id, email) values
  ('65000000-0000-4000-8000-000000000001', 'recruitment-hr@example.com');

insert into public.companies (id, name, slug) values
  ('65000000-0000-4000-8000-000000000101', 'Recruitment Alpha', 'recruitment-alpha'),
  ('65000000-0000-4000-8000-000000000102', 'Recruitment Beta', 'recruitment-beta');

insert into public.company_members (company_id, user_id, role) values
  ('65000000-0000-4000-8000-000000000101', '65000000-0000-4000-8000-000000000001', 'hr');

insert into public.departments (id, company_id, name) values
  ('65000000-0000-4000-8000-000000000201', '65000000-0000-4000-8000-000000000101', 'Alpha Recruitment'),
  ('65000000-0000-4000-8000-000000000202', '65000000-0000-4000-8000-000000000102', 'Beta Recruitment');

insert into public.positions (id, company_id, name) values
  ('65000000-0000-4000-8000-000000000301', '65000000-0000-4000-8000-000000000101', 'Alpha Engineer'),
  ('65000000-0000-4000-8000-000000000302', '65000000-0000-4000-8000-000000000102', 'Beta Engineer');

insert into public.people (id, company_id, full_name) values
  ('65000000-0000-4000-8000-000000000401', '65000000-0000-4000-8000-000000000101', 'Alpha Requester'),
  ('65000000-0000-4000-8000-000000000402', '65000000-0000-4000-8000-000000000101', 'Alpha Recruiter'),
  ('65000000-0000-4000-8000-000000000403', '65000000-0000-4000-8000-000000000101', 'Alpha Approver'),
  ('65000000-0000-4000-8000-000000000404', '65000000-0000-4000-8000-000000000101', 'Alpha Replacement'),
  ('65000000-0000-4000-8000-000000000405', '65000000-0000-4000-8000-000000000102', 'Beta Person');

select ok(
  exists (select 1 from pg_constraint where conname = 'recruitment_job_openings_approver_company_fkey' and convalidated),
  'approver uses a validated tenant-owned foreign key'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'recruitment_job_openings_department_company_fkey' and convalidated),
  'department uses a validated tenant-owned foreign key'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'recruitment_job_openings_position_company_fkey' and convalidated),
  'position uses a validated tenant-owned foreign key'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'recruitment_job_openings_recruiter_company_fkey' and convalidated),
  'recruiter uses a validated tenant-owned foreign key'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'recruitment_job_openings_replaced_employee_company_fkey' and convalidated),
  'replaced employee uses a validated tenant-owned foreign key'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'recruitment_job_openings_requesting_manager_company_fkey' and convalidated),
  'requesting manager uses a validated tenant-owned foreign key'
);

select lives_ok(
  $$
    insert into public.recruitment_job_openings (
      id, company_id, title, description, department_id, position_id,
      requesting_manager_id, recruiter_id, opening_reason,
      replaced_employee_id, opening_justification, work_model,
      employment_type, approver_id, created_by_user_id
    ) values (
      '65000000-0000-4000-8000-000000000501',
      '65000000-0000-4000-8000-000000000101', 'Alpha opening',
      'Same tenant opening', '65000000-0000-4000-8000-000000000201',
      '65000000-0000-4000-8000-000000000301',
      '65000000-0000-4000-8000-000000000401',
      '65000000-0000-4000-8000-000000000402', 'replacement',
      '65000000-0000-4000-8000-000000000404', 'Approved headcount',
      'remote', 'clt', '65000000-0000-4000-8000-000000000403',
      '65000000-0000-4000-8000-000000000001'
    )
  $$,
  'same-tenant recruitment references are accepted'
);

select throws_ok(
  $$ update public.recruitment_job_openings set approver_id = '65000000-0000-4000-8000-000000000405' where id = '65000000-0000-4000-8000-000000000501' $$,
  '23503', null, 'cross-tenant approver is rejected'
);
select throws_ok(
  $$ update public.recruitment_job_openings set department_id = '65000000-0000-4000-8000-000000000202' where id = '65000000-0000-4000-8000-000000000501' $$,
  '23503', null, 'cross-tenant department is rejected'
);
select throws_ok(
  $$ update public.recruitment_job_openings set position_id = '65000000-0000-4000-8000-000000000302' where id = '65000000-0000-4000-8000-000000000501' $$,
  '23503', null, 'cross-tenant position is rejected'
);
select throws_ok(
  $$ update public.recruitment_job_openings set recruiter_id = '65000000-0000-4000-8000-000000000405' where id = '65000000-0000-4000-8000-000000000501' $$,
  '23503', null, 'cross-tenant recruiter is rejected'
);
select throws_ok(
  $$ update public.recruitment_job_openings set replaced_employee_id = '65000000-0000-4000-8000-000000000405' where id = '65000000-0000-4000-8000-000000000501' $$,
  '23503', null, 'cross-tenant replaced employee is rejected'
);
select throws_ok(
  $$ update public.recruitment_job_openings set requesting_manager_id = '65000000-0000-4000-8000-000000000405' where id = '65000000-0000-4000-8000-000000000501' $$,
  '23503', null, 'cross-tenant requesting manager is rejected'
);

select lives_ok(
  $$ update public.recruitment_job_openings
     set approver_id = null, recruiter_id = null,
         opening_reason = 'headcount_growth', replaced_employee_id = null
     where id = '65000000-0000-4000-8000-000000000501' $$,
  'nullable recruitment relationships remain nullable'
);

update public.recruitment_job_openings
set approver_id = '65000000-0000-4000-8000-000000000403'
where id = '65000000-0000-4000-8000-000000000501';
select throws_ok(
  $$ delete from public.people where id = '65000000-0000-4000-8000-000000000403' $$,
  '23503', null, 'RESTRICT continues protecting referenced people'
);

update public.recruitment_job_openings
set approver_id = null, recruiter_id = '65000000-0000-4000-8000-000000000402'
where id = '65000000-0000-4000-8000-000000000501';
delete from public.people where id = '65000000-0000-4000-8000-000000000402';
select is(
  (select recruiter_id from public.recruitment_job_openings where id = '65000000-0000-4000-8000-000000000501'),
  null::uuid,
  'SET NULL clears recruiter_id'
);
select is(
  (select company_id from public.recruitment_job_openings where id = '65000000-0000-4000-8000-000000000501'),
  '65000000-0000-4000-8000-000000000101'::uuid,
  'SET NULL preserves company_id'
);

set local role service_role;
select throws_ok(
  $$ update public.recruitment_job_openings set approver_id = '65000000-0000-4000-8000-000000000405' where id = '65000000-0000-4000-8000-000000000501' $$,
  '23503', null, 'service_role cannot bypass tenant-owned integrity'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"65000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  (select count(*) from public.recruitment_job_openings where company_id = '65000000-0000-4000-8000-000000000101'),
  1::bigint,
  'RLS still allows a company member to read its recruitment opening'
);
select is(
  (select count(*) from public.recruitment_job_openings where company_id = '65000000-0000-4000-8000-000000000102'),
  0::bigint,
  'RLS still isolates recruitment openings from other companies'
);
reset role;

set session_replication_role = replica;
update public.recruitment_job_openings
set position_id = '65000000-0000-4000-8000-000000000302'
where id = '65000000-0000-4000-8000-000000000501';
set session_replication_role = origin;
select ok(
  exists (
    select 1
    from public.recruitment_job_openings source
    left join public.positions target on target.id = source.position_id
    where target.id is null or target.company_id <> source.company_id
  ),
  'read-only preflight predicate detects existing cross-tenant inconsistency'
);

select * from finish();
rollback;
