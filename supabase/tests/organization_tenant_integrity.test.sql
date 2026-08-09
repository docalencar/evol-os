begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(28);

insert into public.companies (id, name, slug) values
  ('62000000-0000-4000-8000-000000000001', 'Integrity Alpha', 'integrity-alpha'),
  ('62000000-0000-4000-8000-000000000002', 'Integrity Beta', 'integrity-beta');

insert into public.departments (id, company_id, name) values
  ('62000000-0000-4000-8000-000000000101', '62000000-0000-4000-8000-000000000001', 'Alpha Parent'),
  ('62000000-0000-4000-8000-000000000102', '62000000-0000-4000-8000-000000000001', 'Alpha Child'),
  ('62000000-0000-4000-8000-000000000103', '62000000-0000-4000-8000-000000000002', 'Beta Department');

insert into public.teams (id, company_id, name) values
  ('62000000-0000-4000-8000-000000000201', '62000000-0000-4000-8000-000000000001', 'Alpha Parent Team'),
  ('62000000-0000-4000-8000-000000000202', '62000000-0000-4000-8000-000000000001', 'Alpha Child Team'),
  ('62000000-0000-4000-8000-000000000203', '62000000-0000-4000-8000-000000000002', 'Beta Team');

insert into public.positions (id, company_id, name) values
  ('62000000-0000-4000-8000-000000000301', '62000000-0000-4000-8000-000000000001', 'Alpha Position'),
  ('62000000-0000-4000-8000-000000000302', '62000000-0000-4000-8000-000000000002', 'Beta Position'),
  ('62000000-0000-4000-8000-000000000303', '62000000-0000-4000-8000-000000000001', 'Alpha Cascade Position');

insert into public.competencies (id, company_id, name, category) values
  ('62000000-0000-4000-8000-000000000401', '62000000-0000-4000-8000-000000000001', 'Alpha Competency', 'technical'),
  ('62000000-0000-4000-8000-000000000402', '62000000-0000-4000-8000-000000000002', 'Beta Competency', 'technical');

insert into public.people (id, company_id, full_name) values
  ('62000000-0000-4000-8000-000000000501', '62000000-0000-4000-8000-000000000001', 'Alpha Manager'),
  ('62000000-0000-4000-8000-000000000502', '62000000-0000-4000-8000-000000000001', 'Alpha Employee'),
  ('62000000-0000-4000-8000-000000000503', '62000000-0000-4000-8000-000000000002', 'Beta Manager');

select ok(
  exists (select 1 from pg_constraint where conname = 'people_id_company_id_key'),
  'people exposes the canonical tenant-owned candidate key'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'departments_id_company_id_key'),
  'departments exposes the canonical tenant-owned candidate key'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'teams_id_company_id_key'),
  'teams exposes the canonical tenant-owned candidate key'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'positions_id_company_id_key'),
  'positions exposes the canonical tenant-owned candidate key'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'competencies_id_company_id_key'),
  'competencies exposes the canonical tenant-owned candidate key'
);

select lives_ok(
  $$
    update public.departments
    set parent_department_id = '62000000-0000-4000-8000-000000000101',
        manager_id = '62000000-0000-4000-8000-000000000501'
    where id = '62000000-0000-4000-8000-000000000102';
    update public.teams
    set parent_team_id = '62000000-0000-4000-8000-000000000201',
        department_id = '62000000-0000-4000-8000-000000000102',
        manager_id = '62000000-0000-4000-8000-000000000501'
    where id = '62000000-0000-4000-8000-000000000202';
    update public.positions
    set department_id = '62000000-0000-4000-8000-000000000102'
    where id = '62000000-0000-4000-8000-000000000301';
    update public.people
    set manager_id = '62000000-0000-4000-8000-000000000501',
        team_id = '62000000-0000-4000-8000-000000000202',
        position_id = '62000000-0000-4000-8000-000000000301'
    where id = '62000000-0000-4000-8000-000000000502';
    insert into public.position_competencies (
      company_id, position_id, competency_id
    ) values (
      '62000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000301',
      '62000000-0000-4000-8000-000000000401'
    );
    insert into public.position_requirements (
      company_id, position_id, category, value
    ) values (
      '62000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000301',
      'knowledge', 'Tenant integrity'
    );
    insert into public.employee_competencies (
      company_id, employee_id, competency_id
    ) values (
      '62000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000502',
      '62000000-0000-4000-8000-000000000401'
    );
  $$,
  'all 14 relationships accept same-tenant references, including self references'
);

select lives_ok(
  $$ insert into public.people (company_id, full_name, manager_id, team_id, position_id)
     values ('62000000-0000-4000-8000-000000000001', 'Nullable Person', null, null, null) $$,
  'nullable relationships remain nullable'
);

select throws_ok(
  $$ update public.departments set parent_department_id = '62000000-0000-4000-8000-000000000103'
     where id = '62000000-0000-4000-8000-000000000102' $$,
  '23503', 'insert or update on table "departments" violates foreign key constraint "departments_parent_department_company_fkey"',
  'department parent rejects cross-tenant reference'
);
select throws_ok(
  $$ update public.departments set manager_id = '62000000-0000-4000-8000-000000000503'
     where id = '62000000-0000-4000-8000-000000000102' $$,
  '23503', 'insert or update on table "departments" violates foreign key constraint "departments_manager_company_fkey"',
  'department manager rejects cross-tenant reference'
);
select throws_ok(
  $$ update public.teams set parent_team_id = '62000000-0000-4000-8000-000000000203'
     where id = '62000000-0000-4000-8000-000000000202' $$,
  '23503', 'insert or update on table "teams" violates foreign key constraint "teams_parent_team_company_fkey"',
  'team parent rejects cross-tenant reference'
);
select throws_ok(
  $$ update public.teams set department_id = '62000000-0000-4000-8000-000000000103'
     where id = '62000000-0000-4000-8000-000000000202' $$,
  '23503', 'insert or update on table "teams" violates foreign key constraint "teams_department_company_fkey"',
  'team department rejects cross-tenant reference'
);
select throws_ok(
  $$ update public.teams set manager_id = '62000000-0000-4000-8000-000000000503'
     where id = '62000000-0000-4000-8000-000000000202' $$,
  '23503', 'insert or update on table "teams" violates foreign key constraint "teams_manager_company_fkey"',
  'team manager rejects cross-tenant reference'
);
select throws_ok(
  $$ update public.positions set department_id = '62000000-0000-4000-8000-000000000103'
     where id = '62000000-0000-4000-8000-000000000301' $$,
  '23503', 'insert or update on table "positions" violates foreign key constraint "positions_department_company_fkey"',
  'position department rejects cross-tenant reference'
);
select throws_ok(
  $$ update public.people set manager_id = '62000000-0000-4000-8000-000000000503'
     where id = '62000000-0000-4000-8000-000000000502' $$,
  '23503', 'insert or update on table "people" violates foreign key constraint "people_manager_company_fkey"',
  'person manager rejects cross-tenant reference'
);
select throws_ok(
  $$ update public.people set team_id = '62000000-0000-4000-8000-000000000203'
     where id = '62000000-0000-4000-8000-000000000502' $$,
  '23503', 'insert or update on table "people" violates foreign key constraint "people_team_company_fkey"',
  'person team rejects cross-tenant reference'
);
select throws_ok(
  $$ update public.people set position_id = '62000000-0000-4000-8000-000000000302'
     where id = '62000000-0000-4000-8000-000000000502' $$,
  '23503', 'insert or update on table "people" violates foreign key constraint "people_position_company_fkey"',
  'person position rejects cross-tenant reference'
);
select throws_ok(
  $$ insert into public.position_competencies (company_id, position_id, competency_id)
     values ('62000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000302', '62000000-0000-4000-8000-000000000401') $$,
  '23503', 'insert or update on table "position_competencies" violates foreign key constraint "position_competencies_position_company_fkey"',
  'position competency rejects cross-tenant position'
);
select throws_ok(
  $$ insert into public.position_competencies (company_id, position_id, competency_id)
     values ('62000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000301', '62000000-0000-4000-8000-000000000402') $$,
  '23503', 'insert or update on table "position_competencies" violates foreign key constraint "position_competencies_competency_company_fkey"',
  'position competency rejects cross-tenant competency'
);
select throws_ok(
  $$ insert into public.position_requirements (company_id, position_id, category, value)
     values ('62000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000302', 'knowledge', 'Cross tenant') $$,
  '23503', 'insert or update on table "position_requirements" violates foreign key constraint "position_requirements_position_company_fkey"',
  'position requirement rejects cross-tenant position'
);
select throws_ok(
  $$ insert into public.employee_competencies (company_id, employee_id, competency_id)
     values ('62000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000503', '62000000-0000-4000-8000-000000000401') $$,
  '23503', 'insert or update on table "employee_competencies" violates foreign key constraint "employee_competencies_employee_company_fkey"',
  'employee competency rejects cross-tenant employee'
);
select throws_ok(
  $$ insert into public.employee_competencies (company_id, employee_id, competency_id)
     values ('62000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000502', '62000000-0000-4000-8000-000000000402') $$,
  '23503', 'insert or update on table "employee_competencies" violates foreign key constraint "employee_competencies_competency_company_fkey"',
  'employee competency rejects cross-tenant competency'
);

set local role service_role;
select throws_ok(
  $$ update public.people set position_id = '62000000-0000-4000-8000-000000000302'
     where id = '62000000-0000-4000-8000-000000000502' $$,
  '42501', 'permission denied for table people',
  'service_role cannot write a cross-tenant organizational reference'
);
reset role;

insert into public.position_competencies (company_id, position_id, competency_id)
values (
  '62000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000303',
  '62000000-0000-4000-8000-000000000401'
);
insert into public.position_requirements (company_id, position_id, category, value)
values (
  '62000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000303',
  'knowledge', 'Cascade fixture'
);
delete from public.positions where id = '62000000-0000-4000-8000-000000000303';
select is(
  (select count(*) from public.position_competencies where position_id = '62000000-0000-4000-8000-000000000303'),
  0::bigint,
  'CASCADE removes position competencies'
);
select is(
  (select count(*) from public.position_requirements where position_id = '62000000-0000-4000-8000-000000000303'),
  0::bigint,
  'CASCADE removes position requirements'
);

delete from public.competencies where id = '62000000-0000-4000-8000-000000000401';
select is(
  (select count(*) from public.employee_competencies where competency_id = '62000000-0000-4000-8000-000000000401'),
  0::bigint,
  'CASCADE removes employee competencies'
);

delete from public.departments where id = '62000000-0000-4000-8000-000000000101';
select is(
  (select parent_department_id from public.departments where id = '62000000-0000-4000-8000-000000000102'),
  null::uuid,
  'SET NULL clears the related column'
);
select is(
  (select company_id from public.departments where id = '62000000-0000-4000-8000-000000000102'),
  '62000000-0000-4000-8000-000000000001'::uuid,
  'SET NULL preserves the tenant column'
);

set session_replication_role = replica;
update public.people
set position_id = '62000000-0000-4000-8000-000000000302'
where id = '62000000-0000-4000-8000-000000000502';
set session_replication_role = origin;
select ok(
  exists (
    select 1
    from public.people source
    left join public.positions target on target.id = source.position_id
    where source.position_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ),
  'read-only preflight predicate detects existing cross-tenant inconsistency'
);

select * from finish();
rollback;
