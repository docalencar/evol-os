begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(34);

grant select on public.development_plans, public.development_goals,
  public.development_actions to authenticated;
grant select, update on public.development_plans to service_role;

insert into auth.users (id, email) values
  ('66000000-0000-4000-8000-000000000001', 'development-hr@example.com');

insert into public.companies (id, name, slug) values
  ('66000000-0000-4000-8000-000000000101', 'Development Alpha', 'development-alpha'),
  ('66000000-0000-4000-8000-000000000102', 'Development Beta', 'development-beta');

insert into public.company_members (company_id, user_id, role) values
  ('66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000001', 'hr');

insert into public.people (id, company_id, full_name) values
  ('66000000-0000-4000-8000-000000000201', '66000000-0000-4000-8000-000000000101', 'Alpha Employee'),
  ('66000000-0000-4000-8000-000000000202', '66000000-0000-4000-8000-000000000101', 'Alpha Owner'),
  ('66000000-0000-4000-8000-000000000203', '66000000-0000-4000-8000-000000000101', 'Alpha Cascade Employee'),
  ('66000000-0000-4000-8000-000000000204', '66000000-0000-4000-8000-000000000102', 'Beta Employee');

insert into public.competencies (id, company_id, name, category) values
  ('66000000-0000-4000-8000-000000000301', '66000000-0000-4000-8000-000000000101', 'Alpha Competency', 'technical'),
  ('66000000-0000-4000-8000-000000000302', '66000000-0000-4000-8000-000000000101', 'Alpha Cascade Competency', 'technical'),
  ('66000000-0000-4000-8000-000000000303', '66000000-0000-4000-8000-000000000102', 'Beta Competency', 'technical');

insert into public.development_plans (
  id, company_id, employee_id, created_by, owner_id, title, status
) values
  ('66000000-0000-4000-8000-000000000401', '66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000201', '66000000-0000-4000-8000-000000000001', '66000000-0000-4000-8000-000000000202', 'Alpha Plan', 'active'),
  ('66000000-0000-4000-8000-000000000402', '66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000203', '66000000-0000-4000-8000-000000000001', null, 'Cascade Plan', 'active'),
  ('66000000-0000-4000-8000-000000000403', '66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000203', '66000000-0000-4000-8000-000000000001', null, 'Closed Plan', 'active'),
  ('66000000-0000-4000-8000-000000000404', '66000000-0000-4000-8000-000000000102', '66000000-0000-4000-8000-000000000204', '66000000-0000-4000-8000-000000000001', null, 'Beta Plan', 'active');

insert into public.development_goals (
  id, company_id, plan_id, competency_id, title,
  current_level, expected_level, target_level
) values
  ('66000000-0000-4000-8000-000000000501', '66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000401', '66000000-0000-4000-8000-000000000301', 'Alpha Goal', 1, 3, 3),
  ('66000000-0000-4000-8000-000000000502', '66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000402', '66000000-0000-4000-8000-000000000302', 'Cascade Goal', 1, 3, 3),
  ('66000000-0000-4000-8000-000000000503', '66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000403', '66000000-0000-4000-8000-000000000302', 'Closed Goal', 1, 3, 3),
  ('66000000-0000-4000-8000-000000000504', '66000000-0000-4000-8000-000000000102', '66000000-0000-4000-8000-000000000404', '66000000-0000-4000-8000-000000000303', 'Beta Goal', 1, 3, 3);

insert into public.development_actions (
  id, company_id, goal_id, title, type
) values
  ('66000000-0000-4000-8000-000000000601', '66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000501', 'Alpha Action', 'course'),
  ('66000000-0000-4000-8000-000000000602', '66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000502', 'Cascade Action', 'course'),
  ('66000000-0000-4000-8000-000000000603', '66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000503', 'Closed Action', 'course'),
  ('66000000-0000-4000-8000-000000000604', '66000000-0000-4000-8000-000000000102', '66000000-0000-4000-8000-000000000504', 'Beta Action', 'course');

update public.development_plans
set status = 'completed'
where id = '66000000-0000-4000-8000-000000000403';

select ok(exists (select 1 from pg_constraint where conname = 'development_plans_id_company_id_key'), 'plans expose tenant-owned candidate key');
select ok(exists (select 1 from pg_constraint where conname = 'development_goals_id_company_id_key'), 'goals expose tenant-owned candidate key');
select ok(exists (select 1 from pg_constraint where conname = 'development_actions_id_company_id_key'), 'actions expose tenant-owned candidate key');

select ok(exists (select 1 from pg_constraint where conname = 'development_plans_employee_company_fkey' and convalidated), 'plan employee FK is validated');
select ok(exists (select 1 from pg_constraint where conname = 'development_plans_owner_company_fkey' and convalidated), 'plan owner FK is validated');
select ok(exists (select 1 from pg_constraint where conname = 'development_goals_plan_company_fkey' and convalidated), 'goal plan FK is validated');
select ok(exists (select 1 from pg_constraint where conname = 'development_goals_competency_company_fkey' and convalidated), 'goal competency FK is validated');
select ok(exists (select 1 from pg_constraint where conname = 'development_actions_goal_company_fkey' and convalidated), 'action goal FK is validated');

select lives_ok(
  $$ update public.development_plans set owner_id = '66000000-0000-4000-8000-000000000202' where id = '66000000-0000-4000-8000-000000000401';
     update public.development_goals set target_level = 4 where id = '66000000-0000-4000-8000-000000000501';
     update public.development_actions set status = 'in_progress' where id = '66000000-0000-4000-8000-000000000601' $$,
  'same-tenant operational Development relations are accepted'
);

select throws_ok($$ update public.development_plans set employee_id = '66000000-0000-4000-8000-000000000204' where id = '66000000-0000-4000-8000-000000000401' $$, '23503', null, 'cross-tenant employee is rejected');
select throws_ok($$ update public.development_plans set owner_id = '66000000-0000-4000-8000-000000000204' where id = '66000000-0000-4000-8000-000000000401' $$, '23503', null, 'cross-tenant owner is rejected');
select throws_ok($$ update public.development_goals set plan_id = '66000000-0000-4000-8000-000000000404' where id = '66000000-0000-4000-8000-000000000501' $$, 'P0002', 'DEVELOPMENT_PLAN_NOT_FOUND', 'cross-tenant plan is rejected by tenant-aware trigger');
select throws_ok($$ update public.development_goals set competency_id = '66000000-0000-4000-8000-000000000303' where id = '66000000-0000-4000-8000-000000000501' $$, '23503', null, 'cross-tenant competency is rejected');
select throws_ok($$ update public.development_actions set goal_id = '66000000-0000-4000-8000-000000000504' where id = '66000000-0000-4000-8000-000000000601' $$, 'P0002', 'DEVELOPMENT_GOAL_OR_PLAN_NOT_FOUND', 'cross-tenant goal is rejected by tenant-aware trigger');

select lives_ok($$ update public.development_plans set owner_id = null where id = '66000000-0000-4000-8000-000000000401' $$, 'plan owner remains nullable');
update public.development_plans set owner_id = '66000000-0000-4000-8000-000000000202' where id = '66000000-0000-4000-8000-000000000401';

select throws_ok($$ delete from public.people where id = '66000000-0000-4000-8000-000000000201' $$, '23503', null, 'RESTRICT protects plan employee');
select throws_ok($$ delete from public.people where id = '66000000-0000-4000-8000-000000000202' $$, '23503', null, 'RESTRICT protects plan owner');
select throws_ok($$ delete from public.competencies where id = '66000000-0000-4000-8000-000000000301' $$, '23503', null, 'RESTRICT protects goal competency');

delete from public.development_plans where id = '66000000-0000-4000-8000-000000000402';
select is((select count(*) from public.development_goals where id = '66000000-0000-4000-8000-000000000502'), 0::bigint, 'CASCADE removes goals with their plan');
select is((select count(*) from public.development_actions where id = '66000000-0000-4000-8000-000000000602'), 0::bigint, 'CASCADE removes actions through their goal');

set local role service_role;
select throws_ok($$ update public.development_plans set employee_id = '66000000-0000-4000-8000-000000000204' where id = '66000000-0000-4000-8000-000000000401' $$, '23503', null, 'service_role cannot bypass tenant-owned integrity');
reset role;

select throws_ok($$ insert into public.development_goals (company_id, plan_id, competency_id, title, current_level, expected_level, target_level) values ('66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000403', '66000000-0000-4000-8000-000000000301', 'Blocked Goal', 1, 3, 3) $$, '55000', 'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY', 'closed plan rejects goal insert');
select throws_ok($$ update public.development_goals set title = 'Blocked' where id = '66000000-0000-4000-8000-000000000503' $$, '55000', 'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY', 'closed plan rejects goal update');
select throws_ok($$ delete from public.development_goals where id = '66000000-0000-4000-8000-000000000503' $$, '55000', 'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY', 'closed plan rejects goal delete');
select throws_ok($$ insert into public.development_actions (company_id, goal_id, title, type) values ('66000000-0000-4000-8000-000000000101', '66000000-0000-4000-8000-000000000503', 'Blocked Action', 'course') $$, '55000', 'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY', 'closed plan rejects action insert');
select throws_ok($$ update public.development_actions set title = 'Blocked' where id = '66000000-0000-4000-8000-000000000603' $$, '55000', 'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY', 'closed plan rejects action update');
select throws_ok($$ delete from public.development_actions where id = '66000000-0000-4000-8000-000000000603' $$, '55000', 'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY', 'closed plan rejects action delete');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"66000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.development_plans where company_id = '66000000-0000-4000-8000-000000000101'), 2::bigint, 'RLS allows member to read own plans');
select is((select count(*) from public.development_goals where company_id = '66000000-0000-4000-8000-000000000101'), 2::bigint, 'RLS allows member to read own goals');
select is((select count(*) from public.development_actions where company_id = '66000000-0000-4000-8000-000000000101'), 2::bigint, 'RLS allows member to read own actions');
select is((select count(*) from public.development_plans where company_id = '66000000-0000-4000-8000-000000000102'), 0::bigint, 'RLS isolates plans from other tenants');
select is((select count(*) from public.development_goals where company_id = '66000000-0000-4000-8000-000000000102'), 0::bigint, 'RLS isolates goals from other tenants');
select is((select count(*) from public.development_actions where company_id = '66000000-0000-4000-8000-000000000102'), 0::bigint, 'RLS isolates actions from other tenants');
reset role;

set session_replication_role = replica;
update public.development_plans
set employee_id = '66000000-0000-4000-8000-000000000204'
where id = '66000000-0000-4000-8000-000000000401';
set session_replication_role = origin;
select ok(
  exists (
    select 1
    from public.development_plans source
    left join public.people target on target.id = source.employee_id
    where target.id is null or target.company_id <> source.company_id
  ),
  'read-only preflight detects existing cross-tenant inconsistency'
);

select * from finish();
rollback;
