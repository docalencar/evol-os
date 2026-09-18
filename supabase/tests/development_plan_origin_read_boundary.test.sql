-- D-DB2 — historical Development plan origin read boundary (0133).
--
-- The property under test is not "the join works". It is that an origin recorded
-- once stays readable and stays TRUE afterwards: through obsolescence of the
-- template it came from, to exactly the actors who may read the plan, and to no
-- one else — while telling an outsider nothing, including whether an origin
-- exists at all.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- 1-8. Object, definer and privilege contract.
-- ---------------------------------------------------------------------------
select has_function(
  'public','get_authorized_development_plan_origins_v1',array['uuid','uuid'],
  'the origin read boundary exists with the expected signature');

-- Exactly once: an overload would be a second contract, and callers could not
-- tell which one they reached.
select is(
  (select count(*)::int from pg_proc p
   join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='get_authorized_development_plan_origins_v1'),
  1,'the boundary is not overloaded');

select is((select prosecdef from pg_proc
  where oid='public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure),
  true,'SECURITY DEFINER');
select is((select proconfig from pg_proc
  where oid='public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure),
  array['search_path=public, pg_temp']::text[],'search path is fixed');
select is((select provolatile from pg_proc
  where oid='public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure),
  's'::"char",'STABLE');
select is((select pg_get_userbyid(proowner) from pg_proc
  where oid='public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure),
  'postgres','owner postgres');

select ok(not has_function_privilege('public',
  'public.get_authorized_development_plan_origins_v1(uuid,uuid)','execute'),
  'PUBLIC cannot execute the origin read');
select ok(not has_function_privilege('anon',
  'public.get_authorized_development_plan_origins_v1(uuid,uuid)','execute'),
  'anon cannot execute the origin read');
select ok(has_function_privilege('authenticated',
  'public.get_authorized_development_plan_origins_v1(uuid,uuid)','execute'),
  'authenticated may execute the origin read');
select ok(not has_function_privilege('service_role',
  'public.get_authorized_development_plan_origins_v1(uuid,uuid)','execute'),
  'service_role cannot execute the origin read');

-- 19. The projection itself is the privacy boundary: a column added later would
-- silently widen it, so the exact return shape is pinned.
select is(
  (select pg_get_function_result(
    'public.get_authorized_development_plan_origins_v1(uuid,uuid)'::regprocedure)),
  'TABLE(plan_id uuid, template_id uuid, template_version_id uuid, template_name text, template_version_number integer)',
  'the boundary returns origin identity and label only — no status, active, scope, revision or author');

-- The ledgers it reads stay closed to clients directly.
select ok(not has_table_privilege('authenticated',
  'public.development_template_application_lineage','select'),
  'authenticated cannot select lineage directly');
select ok(not has_table_privilege('authenticated',
  'public.development_template_application_snapshots','select'),
  'authenticated cannot select application snapshots directly');

-- ---------------------------------------------------------------------------
-- Fixture. Two tenants; one plan built from a template, one plan built without
-- one, and a foreign plan with an origin of its own.
-- ---------------------------------------------------------------------------
insert into auth.users(id,email) values
 ('dd020000-0000-4000-8000-000000000001','ddb2-owner@example.com'),
 ('dd020000-0000-4000-8000-000000000002','ddb2-manager@example.com'),
 ('dd020000-0000-4000-8000-000000000003','ddb2-employee@example.com'),
 ('dd020000-0000-4000-8000-000000000004','ddb2-unrelated@example.com'),
 ('dd020000-0000-4000-8000-000000000005','ddb2-foreign-owner@example.com'),
 ('dd020000-0000-4000-8000-000000000006','ddb2-responsible@example.com');

insert into public.companies(id,name,slug) values
 ('dd020000-0000-4000-8000-000000000101','D DB Two','d-db-two'),
 ('dd020000-0000-4000-8000-000000000102','D DB Two Foreign','d-db-two-foreign');

insert into public.company_members(id,company_id,user_id,role,status) values
 ('dd020000-0000-4000-8000-000000000111','dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000001','owner','active'),
 ('dd020000-0000-4000-8000-000000000112','dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000002','manager','active'),
 ('dd020000-0000-4000-8000-000000000113','dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000003','employee','active'),
 ('dd020000-0000-4000-8000-000000000114','dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000004','employee','active'),
 ('dd020000-0000-4000-8000-000000000115','dd020000-0000-4000-8000-000000000102','dd020000-0000-4000-8000-000000000005','owner','active'),
 ('dd020000-0000-4000-8000-000000000116','dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000006','employee','active');

insert into public.people(id,company_id,user_id,full_name,status,manager_id) values
 ('dd020000-0000-4000-8000-000000000201','dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000001','Owner','active',null),
 ('dd020000-0000-4000-8000-000000000202','dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000002','Manager','active',null),
 ('dd020000-0000-4000-8000-000000000203','dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000003','Employee','active','dd020000-0000-4000-8000-000000000202'),
 ('dd020000-0000-4000-8000-000000000204','dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000004','Unrelated','active',null),
 ('dd020000-0000-4000-8000-000000000205','dd020000-0000-4000-8000-000000000102','dd020000-0000-4000-8000-000000000005','Foreign Owner','active',null),
 ('dd020000-0000-4000-8000-000000000206','dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000006','Responsible','active',null),
 ('dd020000-0000-4000-8000-000000000207','dd020000-0000-4000-8000-000000000102',null,'Foreign Subject','active',null);

insert into public.development_templates(id,company_id,name,description,scope,suggested_duration_days,active,created_by) values
 ('dd020000-0000-4000-8000-000000000301','dd020000-0000-4000-8000-000000000101','Origem Historica','Trilha de origem','company',90,true,'dd020000-0000-4000-8000-000000000001'),
 ('dd020000-0000-4000-8000-000000000302','dd020000-0000-4000-8000-000000000102','Origem Estrangeira',null,'company',30,true,'dd020000-0000-4000-8000-000000000005');

-- Version number 3, so a later assertion proves the HISTORICAL number is
-- returned rather than a default or a position.
insert into public.development_template_versions(
  id,template_id,company_id,scope,version_number,status,name,description,
  suggested_duration_days,created_by,published_by,published_at) values
 ('dd020000-0000-4000-8000-000000000401','dd020000-0000-4000-8000-000000000301',
  'dd020000-0000-4000-8000-000000000101','company',3,'published','Origem Historica','Trilha de origem',
  90,'dd020000-0000-4000-8000-000000000001','dd020000-0000-4000-8000-000000000001',now()),
 ('dd020000-0000-4000-8000-000000000402','dd020000-0000-4000-8000-000000000302',
  'dd020000-0000-4000-8000-000000000102','company',1,'published','Origem Estrangeira',null,
  30,'dd020000-0000-4000-8000-000000000005','dd020000-0000-4000-8000-000000000005',now());

insert into public.development_plans(
  id,company_id,employee_id,created_by,owner_id,template_id,title,description,
  status,priority,updated_at) values
 -- Template-created, and responsible to an explicit operational owner.
 ('dd020000-0000-4000-8000-000000000501','dd020000-0000-4000-8000-000000000101',
  'dd020000-0000-4000-8000-000000000203','dd020000-0000-4000-8000-000000000001',
  'dd020000-0000-4000-8000-000000000206','dd020000-0000-4000-8000-000000000301',
  'Plano com origem',null,'active','medium',now()),
 -- Built by hand: no application, no lineage, no origin.
 ('dd020000-0000-4000-8000-000000000502','dd020000-0000-4000-8000-000000000101',
  'dd020000-0000-4000-8000-000000000203','dd020000-0000-4000-8000-000000000001',
  null,null,'Plano sem origem',null,'active','medium',now()),
 ('dd020000-0000-4000-8000-000000000503','dd020000-0000-4000-8000-000000000102',
  'dd020000-0000-4000-8000-000000000207','dd020000-0000-4000-8000-000000000005',
  null,'dd020000-0000-4000-8000-000000000302','Plano estrangeiro',null,'active','medium',now());

-- The application ledger, in the shape the existing deterministic-infrastructure
-- suite establishes for these tables: a completed application carries its
-- result plan and completion time. The version must be published for the
-- application to be accepted at all, which is why 401 and 402 are obsoleted only
-- later, after the origin is already recorded.
insert into public.development_template_applications(
  id,company_id,template_version_id,actor_user_id,technical_principal,
  idempotency_key,intent_fingerprint,correlation_id,status,
  result_plan_id,completed_at) values
 ('dd020000-0000-4000-8000-000000000601','dd020000-0000-4000-8000-000000000101',
  'dd020000-0000-4000-8000-000000000401','dd020000-0000-4000-8000-000000000001',
  'ddb2-test','ddb2-key-1','ddb2-fingerprint-1',
  'dd020000-0000-4000-8000-000000000701','succeeded',
  'dd020000-0000-4000-8000-000000000501',now()),
 ('dd020000-0000-4000-8000-000000000602','dd020000-0000-4000-8000-000000000102',
  'dd020000-0000-4000-8000-000000000402','dd020000-0000-4000-8000-000000000005',
  'ddb2-test','ddb2-key-2','ddb2-fingerprint-2',
  'dd020000-0000-4000-8000-000000000702','succeeded',
  'dd020000-0000-4000-8000-000000000503',now());

insert into public.development_template_application_snapshots(
  id,application_id,company_id,plan_id,format_version,snapshot) values
 ('dd020000-0000-4000-8000-000000000801','dd020000-0000-4000-8000-000000000601',
  'dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000501',1,
  jsonb_build_object(
    'formatVersion',1,
    'template',jsonb_build_object(
      'id','dd020000-0000-4000-8000-000000000301',
      'versionId','dd020000-0000-4000-8000-000000000401',
      'versionNumber','3','scope','company',
      'name','Origem Historica','description','Trilha de origem',
      'suggestedDurationDays','90'),
    'goals',jsonb_build_array())),
 ('dd020000-0000-4000-8000-000000000802','dd020000-0000-4000-8000-000000000602',
  'dd020000-0000-4000-8000-000000000102','dd020000-0000-4000-8000-000000000503',1,
  jsonb_build_object(
    'formatVersion',1,
    'template',jsonb_build_object(
      'id','dd020000-0000-4000-8000-000000000302',
      'versionId','dd020000-0000-4000-8000-000000000402',
      'versionNumber','1','scope','company',
      'name','Origem Estrangeira','description',null,
      'suggestedDurationDays','30'),
    'goals',jsonb_build_array()));

insert into public.development_template_application_lineage(
  id,application_id,snapshot_id,plan_id,template_version_id,company_id) values
 ('dd020000-0000-4000-8000-000000000901','dd020000-0000-4000-8000-000000000601',
  'dd020000-0000-4000-8000-000000000801','dd020000-0000-4000-8000-000000000501',
  'dd020000-0000-4000-8000-000000000401','dd020000-0000-4000-8000-000000000101'),
 ('dd020000-0000-4000-8000-000000000902','dd020000-0000-4000-8000-000000000602',
  'dd020000-0000-4000-8000-000000000802','dd020000-0000-4000-8000-000000000503',
  'dd020000-0000-4000-8000-000000000402','dd020000-0000-4000-8000-000000000102');

-- ---------------------------------------------------------------------------
-- Unauthenticated.
-- ---------------------------------------------------------------------------
set local role authenticated;

select throws_ok(
  $$select * from public.get_authorized_development_plan_origins_v1('dd020000-0000-4000-8000-000000000101',null)$$,
  '42501','AUTHENTICATION_REQUIRED','an unauthenticated caller reads no origin');

-- ---------------------------------------------------------------------------
-- 9. The subject reads the origin of their own plan.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims','{"sub":"dd020000-0000-4000-8000-000000000003","role":"authenticated"}',true);

select results_eq(
  $$select plan_id, template_id, template_version_id, template_name, template_version_number
    from public.get_authorized_development_plan_origins_v1('dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000501')$$,
  $$values ('dd020000-0000-4000-8000-000000000501'::uuid,
            'dd020000-0000-4000-8000-000000000301'::uuid,
            'dd020000-0000-4000-8000-000000000401'::uuid,
            'Origem Historica'::text, 3)$$,
  'the subject reads the historical origin of their own plan');

-- 22. A plan built without a template yields no origin row — while the plan
-- itself is plainly visible to the same caller through the plan reader. The
-- product must render absence, not invent a name.
select is(
  (select count(*)::int from public.get_authorized_development_plan_origins_v1(
     'dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000502')),
  0,'a plan with no template application has no origin row');
select is(
  (select count(*)::int from public.get_authorized_development_plans_v1(
     'dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000502')),
  1,'...although that same plan is readable: absence of origin is not absence of plan');

-- 20. Set-based: one call, every authorized origin, no N+1 and no tenant-wide
-- fetch for the caller to filter afterwards.
select is(
  (select count(*)::int from public.get_authorized_development_plan_origins_v1(
     'dd020000-0000-4000-8000-000000000101',null)),
  1,'the set-based read returns exactly the authorized origins');

-- ---------------------------------------------------------------------------
-- 10-12. The rest of the canonical plan actor matrix, unrestated.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims','{"sub":"dd020000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(
  (select template_name from public.get_authorized_development_plan_origins_v1(
     'dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000501')),
  'Origem Historica','the current manager reads a direct report''s plan origin');

select set_config('request.jwt.claims','{"sub":"dd020000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select is(
  (select template_name from public.get_authorized_development_plan_origins_v1(
     'dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000501')),
  'Origem Historica','the explicit active operational owner reads the plan origin');

select set_config('request.jwt.claims','{"sub":"dd020000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(
  (select template_name from public.get_authorized_development_plan_origins_v1(
     'dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000501')),
  'Origem Historica','an owner/admin/hr actor reads the tenant plan origin');

-- ---------------------------------------------------------------------------
-- 13, 15, 16. Denial and opacity. A same-company actor with no relationship to
-- the plan, a plan that does not exist, and a plan in another tenant must all
-- produce the SAME observable result — zero rows, no error, no distinguishing
-- message — so that absence can never be read as confirmation.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims','{"sub":"dd020000-0000-4000-8000-000000000004","role":"authenticated"}',true);

select is(
  (select count(*)::int from public.get_authorized_development_plan_origins_v1(
     'dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000501')),
  0,'a same-company unrelated actor reads no origin for a plan that exists');
select is(
  (select count(*)::int from public.get_authorized_development_plan_origins_v1(
     'dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000000')),
  0,'a nonexistent plan reads as zero rows');
select is(
  (select count(*)::int from public.get_authorized_development_plan_origins_v1(
     'dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000503')),
  0,'a plan in another tenant reads as zero rows');
select lives_ok(
  $$select * from public.get_authorized_development_plan_origins_v1('dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000000')$$,
  'the inaccessible and the nonexistent are both silent: neither raises');
select is(
  (select count(*)::int from public.get_authorized_development_plan_origins_v1(
     'dd020000-0000-4000-8000-000000000101',null)),
  0,'an unrelated actor''s whole-tenant origin read is empty');

-- ---------------------------------------------------------------------------
-- 14, 21. Foreign tenant.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims','{"sub":"dd020000-0000-4000-8000-000000000005","role":"authenticated"}',true);

select throws_ok(
  $$select * from public.get_authorized_development_plan_origins_v1('dd020000-0000-4000-8000-000000000101',null)$$,
  '42501','TENANT_AUTHORIZATION_DENIED','a foreign actor cannot address another tenant');
select is(
  (select count(*)::int from public.get_authorized_development_plan_origins_v1(
     'dd020000-0000-4000-8000-000000000102','dd020000-0000-4000-8000-000000000501')),
  0,'naming a foreign plan id under one''s own tenant returns nothing');
select results_eq(
  $$select plan_id, template_name from public.get_authorized_development_plan_origins_v1(
      'dd020000-0000-4000-8000-000000000102',null)$$,
  $$values ('dd020000-0000-4000-8000-000000000503'::uuid,'Origem Estrangeira'::text)$$,
  'a foreign owner reads only their own tenant''s origins — no cross-tenant row leaks');

-- ---------------------------------------------------------------------------
-- 17, 18. THE POINT OF THE SLICE. Obsolete the template that produced the plan
-- and read the origin again. This is the exact case the published catalog and
-- the legacy `active = true` reader both lose.
-- ---------------------------------------------------------------------------
reset role;
update public.development_template_versions
set status='obsolete',
    obsoleted_by='dd020000-0000-4000-8000-000000000001',
    obsoleted_at=now()
where id='dd020000-0000-4000-8000-000000000401';
update public.development_templates
set active=false, updated_at=now()
where id='dd020000-0000-4000-8000-000000000301';

select is((select status from public.development_template_versions
  where id='dd020000-0000-4000-8000-000000000401'),
  'obsolete','precondition: the origin template version is now obsolete');
select is((select active from public.development_templates
  where id='dd020000-0000-4000-8000-000000000301'),
  false,'precondition: the origin container is now inactive');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"dd020000-0000-4000-8000-000000000003","role":"authenticated"}',true);

select results_eq(
  $$select plan_id, template_id, template_version_id, template_name, template_version_number
    from public.get_authorized_development_plan_origins_v1('dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000501')$$,
  $$values ('dd020000-0000-4000-8000-000000000501'::uuid,
            'dd020000-0000-4000-8000-000000000301'::uuid,
            'dd020000-0000-4000-8000-000000000401'::uuid,
            'Origem Historica'::text, 3)$$,
  'the origin survives obsolescence unchanged: same identities, same name, same version number');

-- And the contrast that motivated the slice: the participant-facing catalog has
-- nothing to say about this template any more.
select is(
  (select count(*)::int from public.get_published_development_template_catalog_v1(
     'dd020000-0000-4000-8000-000000000101')
   where template_id='dd020000-0000-4000-8000-000000000301'),
  0,'the published catalog no longer carries this template — which is why the origin reader had to exist');

-- 18, continued. The historical version number is a fact about the version, not
-- a position in a list: a newer published version of the same container does not
-- move it.
reset role;
insert into public.development_template_versions(
  id,template_id,company_id,scope,version_number,status,name,description,
  suggested_duration_days,created_by,published_by,published_at) values
 ('dd020000-0000-4000-8000-000000000403','dd020000-0000-4000-8000-000000000301',
  'dd020000-0000-4000-8000-000000000101','company',4,'published','Origem Renomeada','Nova trilha',
  120,'dd020000-0000-4000-8000-000000000001','dd020000-0000-4000-8000-000000000001',now());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"dd020000-0000-4000-8000-000000000003","role":"authenticated"}',true);

select results_eq(
  $$select template_name, template_version_number
    from public.get_authorized_development_plan_origins_v1('dd020000-0000-4000-8000-000000000101','dd020000-0000-4000-8000-000000000501')$$,
  $$values ('Origem Historica'::text, 3)$$,
  'a newer published version of the same container does not rewrite the recorded origin');

-- ---------------------------------------------------------------------------
-- The evidence this reader depends on is enforced, not merely conventional.
-- ---------------------------------------------------------------------------
reset role;
select throws_ok(
  $$update public.development_template_application_snapshots
    set snapshot = jsonb_set(snapshot,'{template,name}','"Reescrito"')
    where id='dd020000-0000-4000-8000-000000000801'$$,
  '55000','DEVELOPMENT_TEMPLATE_APPLICATION_HISTORY_IMMUTABLE',
  'the snapshot cannot be rewritten, so the origin label cannot be revised after the fact');
select throws_ok(
  $$delete from public.development_template_application_lineage
    where id='dd020000-0000-4000-8000-000000000901'$$,
  '55000','DEVELOPMENT_TEMPLATE_APPLICATION_HISTORY_IMMUTABLE',
  'lineage cannot be deleted, so a plan cannot be severed from its origin');
select throws_ok(
  $$update public.development_template_versions set name='Renomeado'
    where id='dd020000-0000-4000-8000-000000000401'$$,
  '55000','DEVELOPMENT_TEMPLATE_VERSION_IMMUTABLE',
  'a published or obsolete version cannot be renamed');

-- ---------------------------------------------------------------------------
-- 23. D-DB1 privacy is unchanged by this migration.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"dd020000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is(
  (select count(*)::int from public.get_authorized_development_plans_v1(
     'dd020000-0000-4000-8000-000000000101',null)),
  0,'an unrelated actor still reads no plans: the plan boundary is untouched');

select set_config('request.jwt.claims','{"sub":"dd020000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is(
  (select count(*)::int from public.get_authorized_development_plans_v1(
     'dd020000-0000-4000-8000-000000000101',null)),
  2,'the subject still reads exactly their own two plans');
select ok(not has_table_privilege('authenticated','public.development_plans','select'),
  'direct plan SELECT stays closed to authenticated');

-- ---------------------------------------------------------------------------
-- 24. Retention. 0133 adds a function and nothing else, so the 0126 contract
-- still names exactly its four ledgers and still counts the rows this fixture
-- wrote.
-- ---------------------------------------------------------------------------
reset role;
select set_eq(
  $$select relation_name from public.get_company_retention_pressure_v1(
      'dd020000-0000-4000-8000-000000000101')$$,
  $$values ('development_template_applications'::text),
           ('development_template_application_attempts'::text),
           ('development_template_application_snapshots'::text),
           ('development_template_application_lineage'::text)$$,
  'the 0126 four-ledger retention contract is unchanged');
select is(
  (select row_count from public.get_company_retention_pressure_v1(
     'dd020000-0000-4000-8000-000000000101')
   where relation_name='development_template_application_lineage'),
  1::bigint,'retention still sees the lineage this slice reads');
-- 0126's own grant model is the inverse of this slice's — retention pressure is
-- an operational read for service_role, the origin label is a participant read
-- for authenticated. Neither migration disturbs the other.
select ok(has_function_privilege('service_role',
  'public.get_company_retention_pressure_v1(uuid)','execute'),
  'retention pressure is still executable by service_role');
select ok(not has_function_privilege('authenticated',
  'public.get_company_retention_pressure_v1(uuid)','execute'),
  'retention pressure is still closed to authenticated');

select * from finish();
rollback;
