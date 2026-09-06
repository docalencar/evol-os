begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- Slice 0126 — counts-only retention boundary.
--
-- The point of this boundary is that it discloses a NUMBER and never a ROW, and
-- that it does so without reversing the 0069 revoke. Both halves are asserted:
-- the function must work, and service_role must STILL be unable to read the
-- underlying tables directly.

-- 1. exact signature -------------------------------------------------------
select has_function('public','get_company_retention_pressure_v1',array['uuid']::text[]);

select is(
  (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'get_company_retention_pressure_v1'),
  1::bigint,
  'function name is unique — no overload can shadow the reviewed contract');

select is(
  (select proargnames from pg_proc
   where oid = 'public.get_company_retention_pressure_v1(uuid)'::regprocedure),
  array['p_company_id','relation_name','row_count']::text[],
  'argument and return column names are exact');

select is(
  (select array_agg(format_type(type_oid, null) order by ordinal)
     from pg_proc p, unnest(p.proallargtypes) with ordinality t(type_oid, ordinal)
   where p.oid = 'public.get_company_retention_pressure_v1(uuid)'::regprocedure),
  array['uuid','text','bigint']::text[],
  'returns relation_name text + row_count bigint, and nothing else');

-- 2 & 3. SECURITY DEFINER, non-volatile, hardened search_path --------------
select ok(
  p.prosecdef,
  'boundary is SECURITY DEFINER — that is what lets it count what service_role cannot read')
from pg_proc p where p.oid = 'public.get_company_retention_pressure_v1(uuid)'::regprocedure;

select is(
  (select provolatile from pg_proc
   where oid = 'public.get_company_retention_pressure_v1(uuid)'::regprocedure),
  's'::"char",
  'boundary is STABLE — it must never be able to write');

-- Assert the PROPERTY, not one spelling of it. `SET search_path = ''` is stored
-- by the catalog as `search_path=""` — with literal quotes — so comparing
-- proconfig to array['search_path='] tested a representation that never occurs.
-- This parses the entry instead: exactly one search_path setting must be pinned,
-- and its value must resolve to empty once the quoting is stripped. A function
-- with no SET at all yields zero rows and fails; `search_path=public, pg_temp`
-- fails; both `search_path=` and `search_path=""` pass.
select ok(
  (select count(*) = 1
     from unnest(p.proconfig) cfg
    where cfg like 'search_path=%'
      and btrim(split_part(cfg, '=', 2), '"') = ''),
  'search_path is pinned and effectively empty; every reference in the body is schema-qualified')
from pg_proc p
where p.oid = 'public.get_company_retention_pressure_v1(uuid)'::regprocedure;

-- 4, 5, 6. execute privileges ---------------------------------------------
select ok(
  not has_function_privilege('anon',
    'public.get_company_retention_pressure_v1(uuid)', 'execute'),
  'anon cannot execute the boundary');

select ok(
  not has_function_privilege('authenticated',
    'public.get_company_retention_pressure_v1(uuid)', 'execute'),
  'authenticated cannot execute the boundary');

select ok(
  has_function_privilege('service_role',
    'public.get_company_retention_pressure_v1(uuid)', 'execute'),
  'service_role can execute the boundary');

-- 7 & 13. the 0069 boundary is INTACT — this is the whole point ------------
select ok(
  not has_table_privilege('service_role','public.development_template_applications','select'),
  'service_role STILL has no direct SELECT on development_template_applications');

select ok(
  not has_table_privilege('service_role','public.development_template_application_attempts','select')
  and not has_table_privilege('service_role','public.development_template_application_snapshots','select')
  and not has_table_privilege('service_role','public.development_template_application_lineage','select'),
  'the rest of the 0069 revoke is untouched');

select ok(
  not has_table_privilege('anon','public.development_template_applications','select')
  and not has_table_privilege('public','public.development_template_applications','select'),
  'anon and PUBLIC remain revoked (0068)');

select ok(
  has_table_privilege('authenticated','public.development_template_applications','select'),
  'the authenticated SELECT grant from 0068 is neither removed nor widened');

select ok(
  (select relrowsecurity from pg_class
   where oid = 'public.development_template_applications'::regclass),
  'RLS on the ledger is still enabled');

-- fixtures -----------------------------------------------------------------
-- Two tenants, so cross-tenant leakage is provable rather than assumed.
insert into auth.users (id, email) values
  ('99000000-0000-4000-8000-000000000009','retention-probe@example.com');

insert into public.companies (id, name, slug, status) values
  ('aaaaaaaa-0000-4000-8000-000000000001','Retention Probe A','retention-probe-a','active'),
  ('bbbbbbbb-0000-4000-8000-000000000002','Retention Probe B','retention-probe-b','active');

-- 8. a company with no ledger rows counts 0 on every relation --------------
select is(
  (select count(*) from public.get_company_retention_pressure_v1(
     'aaaaaaaa-0000-4000-8000-000000000001')),
  4::bigint,
  'exactly four relations are reported');

select is(
  (select coalesce(sum(row_count),0)::bigint from public.get_company_retention_pressure_v1(
     'aaaaaaaa-0000-4000-8000-000000000001')),
  0::bigint,
  'an untouched company has zero retention pressure');

-- 12. the four relation names are exact ------------------------------------
select is(
  (select array_agg(relation_name order by relation_name)
     from public.get_company_retention_pressure_v1(
       'aaaaaaaa-0000-4000-8000-000000000001')),
  array[
    'development_template_application_attempts',
    'development_template_application_lineage',
    'development_template_application_snapshots',
    'development_template_applications'
  ]::text[],
  'reports exactly the four relations whose SELECT 0069 revoked from service_role');

-- 9 & 10. a real ledger row is counted, and only for its own tenant --------
--
-- The application ledger has a real domain invariant behind it:
-- `validate_development_template_application_version` (0068:547) refuses any
-- application whose version is not `published`, and whose company does not match
-- a `company`-scoped version. An earlier draft of this fixture created the
-- version as `draft`, which is a perfectly ordinary state for a version and a
-- completely invalid one to apply — the trigger raised
-- DEVELOPMENT_TEMPLATE_APPLICATION_VERSION_INVALID and aborted the file before
-- finish().
--
-- The fix is to build a version that is genuinely applicable, not to weaken the
-- check. `development_template_versions_lifecycle_check` requires a published
-- version to carry both `published_by` and `published_at`, and the immutability
-- trigger `protect_development_template_version` fires BEFORE UPDATE OR DELETE
-- only — so inserting a fully-formed published row is the honest minimal path
-- and needs no state transition.
insert into public.development_templates
  (id, company_id, name, scope, active, created_by)
values ('cccccccc-0000-4000-8000-000000000003',
        'aaaaaaaa-0000-4000-8000-000000000001',
        'Retention Probe Template', 'company', true,
        '99000000-0000-4000-8000-000000000009');

insert into public.development_template_versions
  (id, company_id, template_id, scope, version_number, status, name,
   created_by, published_by, published_at)
values ('dddddddd-0000-4000-8000-000000000004',
        'aaaaaaaa-0000-4000-8000-000000000001',
        'cccccccc-0000-4000-8000-000000000003',
        'company', 1, 'published', 'Retention Probe Version',
        '99000000-0000-4000-8000-000000000009',
        '99000000-0000-4000-8000-000000000009', now());

insert into public.development_template_applications
  (id, company_id, template_version_id, actor_user_id, technical_principal,
   idempotency_key, intent_fingerprint, correlation_id, status)
values ('eeeeeeee-0000-4000-8000-000000000005',
        'aaaaaaaa-0000-4000-8000-000000000001',
        'dddddddd-0000-4000-8000-000000000004',
        '99000000-0000-4000-8000-000000000009',
        'pgtap', 'retention-probe-key', 'retention-probe-fingerprint',
        gen_random_uuid(), 'pending');

select is(
  (select row_count from public.get_company_retention_pressure_v1(
     'aaaaaaaa-0000-4000-8000-000000000001')
   where relation_name = 'development_template_applications'),
  1::bigint,
  'a real ledger row is counted for its own company');

select is(
  (select coalesce(sum(row_count),0)::bigint from public.get_company_retention_pressure_v1(
     'bbbbbbbb-0000-4000-8000-000000000002')),
  0::bigint,
  'another tenant sees none of it — counts never cross the company boundary');

select is(
  (select row_count from public.get_company_retention_pressure_v1(null)
   where relation_name = 'development_template_applications'),
  0::bigint,
  'a null company matches nothing rather than widening to every company');

-- 11. no payload leaks: the return type physically cannot carry a row ------
select is(
  (select count(*) from pg_proc p, unnest(p.proallargtypes) t(type_oid)
   where p.oid = 'public.get_company_retention_pressure_v1(uuid)'::regprocedure
     and format_type(t.type_oid, null) not in ('uuid','text','bigint')),
  0::bigint,
  'the signature admits only uuid/text/bigint — no row, record, json or composite');

select is(
  (select count(*) from public.get_company_retention_pressure_v1(
     'aaaaaaaa-0000-4000-8000-000000000001')
   where relation_name not like 'development_template_application%'),
  0::bigint,
  'no relation outside the reviewed closed list is ever reported');

select * from finish();
rollback;
