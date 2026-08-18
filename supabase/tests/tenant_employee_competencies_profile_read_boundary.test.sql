begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Static contract.
-- ---------------------------------------------------------------------------
select has_function('public','get_tenant_employee_competencies_v1',array['uuid','uuid']::text[]);

select is(
  (select proargnames from pg_proc where oid='public.get_tenant_employee_competencies_v1(uuid,uuid)'::regprocedure),
  array['p_company_id','p_employee_id','employee_competency_id','employee_id','competency_id','competency_name','current_level','source','validated_at','notes']::text[],
  'contract shape is exact and exposes no Auth user id');
select is(
  (select array_agg(format_type(type_oid,null) order by ordinal) from pg_proc p,
    unnest(p.proallargtypes) with ordinality t(type_oid,ordinal)
    where p.oid='public.get_tenant_employee_competencies_v1(uuid,uuid)'::regprocedure),
  array['uuid','uuid','uuid','uuid','uuid','text','integer','text','timestamp with time zone','text']::text[],
  'contract types are exact');

select ok(p.prosecdef and p.provolatile='s' and p.proconfig=array['search_path=public, pg_temp']::text[],
  'get_tenant_employee_competencies_v1 is stable, SECURITY DEFINER with hardened search_path')
from pg_proc p where p.oid='public.get_tenant_employee_competencies_v1(uuid,uuid)'::regprocedure;

select ok(has_function_privilege('authenticated','public.get_tenant_employee_competencies_v1(uuid,uuid)','execute'),
  'authenticated may execute the boundary');
select ok(not has_function_privilege('anon','public.get_tenant_employee_competencies_v1(uuid,uuid)','execute'),
  'anon cannot execute the boundary');
select ok(not has_table_privilege('authenticated','public.employee_competencies','select'),
  'authenticated still has no direct SELECT on employee_competencies');
select ok(not has_table_privilege('authenticated','public.competencies','select'),
  'authenticated still has no direct SELECT on competencies');

-- ---------------------------------------------------------------------------
-- Fixtures. Alpha owns a TERMINATED person with two active competency records
-- (plus one archived, which must be excluded); Beta owns a foreign person and
-- competency record that must never leak.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('91000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('91000000-0000-4000-8000-000000000003','owner-b@example.com');

insert into public.companies (id, name, slug) values
  ('91000000-0000-4000-8000-000000000101','J1 Alpha','j1c-alpha'),
  ('91000000-0000-4000-8000-000000000102','J1 Beta','j1c-beta');

insert into public.company_members (id, company_id, user_id, role, status) values
  ('91000000-0000-4000-8000-000000000111','91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000001','owner','active'),
  ('91000000-0000-4000-8000-000000000112','91000000-0000-4000-8000-000000000102','91000000-0000-4000-8000-000000000003','owner','active');

insert into public.people (id, company_id, full_name, email, status) values
  ('91000000-0000-4000-8000-000000000201','91000000-0000-4000-8000-000000000101','Ana Desligada','ana@example.com','terminated'),
  ('91000000-0000-4000-8000-000000000202','91000000-0000-4000-8000-000000000102','Foreign Person','foreign@example.com','active');

insert into public.competencies (id, company_id, name, category) values
  ('91000000-0000-4000-8000-000000000301','91000000-0000-4000-8000-000000000101','Comunicação','behavioral'),
  ('91000000-0000-4000-8000-000000000302','91000000-0000-4000-8000-000000000101','Liderança','leadership'),
  ('91000000-0000-4000-8000-000000000303','91000000-0000-4000-8000-000000000102','Foco','behavioral');

insert into public.employee_competencies
  (id, company_id, employee_id, competency_id, current_level, source, validated_at, notes, archived_at, created_at) values
  ('91000000-0000-4000-8000-000000000401','91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201','91000000-0000-4000-8000-000000000301',3,'assessment','2026-01-10T00:00:00Z','nota A1',null,'2026-01-01T00:00:00Z'),
  ('91000000-0000-4000-8000-000000000402','91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201','91000000-0000-4000-8000-000000000302',5,'manual',null,null,null,'2026-01-02T00:00:00Z'),
  ('91000000-0000-4000-8000-000000000403','91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201','91000000-0000-4000-8000-000000000301',2,'manual',null,'arquivada','2026-02-01T00:00:00Z','2026-01-03T00:00:00Z'),
  ('91000000-0000-4000-8000-000000000404','91000000-0000-4000-8000-000000000102','91000000-0000-4000-8000-000000000202','91000000-0000-4000-8000-000000000303',4,'self',null,'beta',null,'2026-01-04T00:00:00Z');

-- Characterize the fixture from the privileged setup role: `authenticated`
-- intentionally has NO direct SELECT on public.people, so this invariant check
-- must run before switching role. Termination behavior itself is proven below
-- exclusively through the public boundary.
select is((select status from public.people where id='91000000-0000-4000-8000-000000000201'),
  'terminated','fixture subject is terminated');

-- ---------------------------------------------------------------------------
-- Behavioral, as the active Alpha owner (management reader).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- The subject (terminated above) must remain readable through the boundary.
select is(
  (select count(*)::int from public.get_tenant_employee_competencies_v1('91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201')),
  2, 'authorized actor reads the terminated employee competencies, archived excluded');

select is(
  (select array_agg(competency_id order by competency_name)
     from public.get_tenant_employee_competencies_v1('91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201')),
  array['91000000-0000-4000-8000-000000000301','91000000-0000-4000-8000-000000000302']::uuid[],
  'exactly the two active competency rows are returned');

select is((select competency_name from public.get_tenant_employee_competencies_v1(
    '91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201')
    where competency_id='91000000-0000-4000-8000-000000000301'),
  'Comunicação','competency_name resolves via the join');
select is((select current_level from public.get_tenant_employee_competencies_v1(
    '91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201')
    where competency_id='91000000-0000-4000-8000-000000000301'),
  3,'current_level preserved');
select is((select source from public.get_tenant_employee_competencies_v1(
    '91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201')
    where competency_id='91000000-0000-4000-8000-000000000301'),
  'assessment','source preserved');
select is((select validated_at from public.get_tenant_employee_competencies_v1(
    '91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201')
    where competency_id='91000000-0000-4000-8000-000000000301'),
  '2026-01-10T00:00:00Z'::timestamptz,'validated_at preserved');
select is((select notes from public.get_tenant_employee_competencies_v1(
    '91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201')
    where competency_id='91000000-0000-4000-8000-000000000301'),
  'nota A1','notes preserved');
select is((select validated_at from public.get_tenant_employee_competencies_v1(
    '91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201')
    where competency_id='91000000-0000-4000-8000-000000000302'),
  null,'nullable validated_at preserved as null');

-- Cross-tenant: the Beta employee's competencies never leak to an Alpha actor.
select is(
  (select count(*)::int from public.get_tenant_employee_competencies_v1('91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000202')),
  0, 'cross-tenant employee competencies are not readable');
reset role;

-- Non-member (Beta owner) denied on Alpha.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_tenant_employee_competencies_v1('91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201')$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a non-member is denied');
reset role;

-- Unauthenticated (no sub) denied.
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok(
  $$select * from public.get_tenant_employee_competencies_v1('91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000201')$$,
  '42501','AUTHENTICATION_REQUIRED','an unauthenticated actor is denied');
reset role;

select * from finish();
rollback;
