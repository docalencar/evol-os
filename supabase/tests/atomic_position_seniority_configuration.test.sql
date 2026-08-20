begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Schema / security.
-- ---------------------------------------------------------------------------
select has_function('public','create_tenant_position_with_seniorities_v1',
  array['uuid','text','text','uuid','text','text','integer','text','text','text','text','uuid[]'],
  'atomic position-create boundary exists');
select has_function('public','update_tenant_position_with_seniorities_v1',
  array['uuid','uuid','text','text','uuid','text','text','integer','text','text','text','uuid[]'],
  'atomic position-update boundary exists');
select ok(has_function_privilege('authenticated',
  'public.create_tenant_position_with_seniorities_v1(uuid,text,text,uuid,text,text,integer,text,text,text,text,uuid[])','execute'),
  'authenticated may execute the atomic create boundary');
select ok(has_function_privilege('authenticated',
  'public.update_tenant_position_with_seniorities_v1(uuid,uuid,text,text,uuid,text,text,integer,text,text,text,uuid[])','execute'),
  'authenticated may execute the atomic update boundary');
select ok(not has_function_privilege('anon',
  'public.create_tenant_position_with_seniorities_v1(uuid,text,text,uuid,text,text,integer,text,text,text,text,uuid[])','execute'),
  'anon may not execute the atomic create boundary');

-- ---------------------------------------------------------------------------
-- Fixtures.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a6000000-0000-4000-8000-000000000001','owner-a@example.com'),
  ('a6000000-0000-4000-8000-000000000005','employee-a@example.com');
insert into public.companies (id, name, slug) values
  ('a6000000-0000-4000-8000-000000000101','PS Alpha','ps-alpha');
insert into public.company_members (id, company_id, user_id, role, status) values
  ('a6000000-0000-4000-8000-000000000111','a6000000-0000-4000-8000-000000000101','a6000000-0000-4000-8000-000000000001','owner','active'),
  ('a6000000-0000-4000-8000-000000000115','a6000000-0000-4000-8000-000000000101','a6000000-0000-4000-8000-000000000005','employee','active');
insert into public.seniority_levels (id, company_id, code, label, rank, active) values
  ('a6000000-0000-4000-8000-000000000201','a6000000-0000-4000-8000-000000000101','JR','Junior',10,true),
  ('a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000101','PL','Pleno',20,true),
  ('a6000000-0000-4000-8000-000000000203','a6000000-0000-4000-8000-000000000101','SR','Senior',30,true),
  ('a6000000-0000-4000-8000-000000000209','a6000000-0000-4000-8000-000000000101','OB','Obsoleta',5,false);

create temporary table t(name text, id uuid) on commit drop;
grant select, insert on t to authenticated;

-- ---------------------------------------------------------------------------
-- CREATE as the Alpha owner.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a6000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

-- A. atomic create with three seniorities.
insert into t values ('pa',
  ((public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','Analista',null,null,
    'analyst','active',40,'on_site','clt','none','cr-a',
    array['a6000000-0000-4000-8000-000000000201','a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[]
  )) ->> 'positionId')::uuid);
-- D. empty selection.
insert into t values ('pd',
  ((public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','Assistente',null,null,
    'assistant','active',40,'on_site','clt','none','cr-d', '{}'::uuid[])) ->> 'positionId')::uuid);

-- E. duplicate input ids fail safely (nothing created).
select throws_ok($$select public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','Dup',null,null,
    'analyst','active',40,'on_site','clt','none','cr-e',
    array['a6000000-0000-4000-8000-000000000201','a6000000-0000-4000-8000-000000000201']::uuid[])$$,
  '22023','VALIDATION_FAILED','duplicate seniority ids are rejected');
-- F. archived seniority fails and creates nothing.
select throws_ok($$select public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','Arch',null,null,
    'analyst','active',40,'on_site','clt','none','cr-f',
    array['a6000000-0000-4000-8000-000000000201','a6000000-0000-4000-8000-000000000209']::uuid[])$$,
  'P0002','SENIORITY_LEVEL_NOT_FOUND','an archived seniority is rejected');
-- G. invalid/nonexistent seniority fails.
select throws_ok($$select public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','Bad',null,null,
    'analyst','active',40,'on_site','clt','none','cr-g',
    array['a6000000-0000-4000-8000-0000000009ff']::uuid[])$$,
  'P0002','SENIORITY_LEVEL_NOT_FOUND','a nonexistent seniority is rejected');

-- H/I. idempotency.
insert into t values ('pk',
  ((public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','Idem',null,null,
    'analyst','active',40,'on_site','clt','none','cr-k',
    array['a6000000-0000-4000-8000-000000000201','a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[]
  )) ->> 'positionId')::uuid);
select is((public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','Idem',null,null,
    'analyst','active',40,'on_site','clt','none','cr-k',
    array['a6000000-0000-4000-8000-000000000201','a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[])) ->> 'status',
  'idempotent_retry','same key + same seniority set converges');
select throws_ok($$select public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','Idem',null,null,
    'analyst','active',40,'on_site','clt','none','cr-k',
    array['a6000000-0000-4000-8000-000000000201']::uuid[])$$,
  '23505','IDEMPOTENCY_CONFLICT','same key + changed seniority set conflicts');

-- Positions for the UPDATE scenarios.
insert into t values ('pl', ((public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','PL',null,null,'analyst','active',40,'on_site','clt','none','cr-l', array['a6000000-0000-4000-8000-000000000201']::uuid[])) ->> 'positionId')::uuid);
insert into t values ('pm', ((public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','PM',null,null,'analyst','active',40,'on_site','clt','none','cr-m', array['a6000000-0000-4000-8000-000000000201','a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[])) ->> 'positionId')::uuid);
insert into t values ('pn', ((public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','PN',null,null,'analyst','active',40,'on_site','clt','none','cr-n', array['a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[])) ->> 'positionId')::uuid);
insert into t values ('po', ((public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','PO',null,null,'analyst','active',40,'on_site','clt','none','cr-o', array['a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[])) ->> 'positionId')::uuid);
insert into t values ('pp', ((public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','PP',null,null,'analyst','active',40,'on_site','clt','none','cr-p', array['a6000000-0000-4000-8000-000000000201']::uuid[])) ->> 'positionId')::uuid);
insert into t values ('pq', ((public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','PQ',null,null,'analyst','active',40,'on_site','clt','none','cr-q', array['a6000000-0000-4000-8000-000000000202']::uuid[])) ->> 'positionId')::uuid);
insert into t values ('ph', ((public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','PH',null,null,'analyst','active',40,'on_site','clt','none','cr-h', array['a6000000-0000-4000-8000-000000000201']::uuid[])) ->> 'positionId')::uuid);

-- L. {JR} -> {JR,PL,SR}: adds only PL/SR.
select is((public.update_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101',(select id from t where name='pl'),
    'PL',null,null,'analyst','active',40,'on_site','clt','none',
    array['a6000000-0000-4000-8000-000000000201','a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[])) ->> 'status',
  'succeeded','update adds newly-selected seniorities');
-- M. {JR,PL,SR} -> {PL,SR}: archives JR only.
select is((public.update_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101',(select id from t where name='pm'),
    'PM',null,null,'analyst','active',40,'on_site','clt','none',
    array['a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[])) ->> 'status',
  'succeeded','update archives removed seniorities');
-- N. unchanged desired set.
select is((public.update_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101',(select id from t where name='pn'),
    'PN',null,null,'analyst','active',40,'on_site','clt','none',
    array['a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[])) ->> 'status',
  'succeeded','update with an unchanged set succeeds');
-- O. empty desired set: archive all specific.
select is((public.update_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101',(select id from t where name='po'),
    'PO',null,null,'analyst','active',40,'on_site','clt','none', '{}'::uuid[])) ->> 'status',
  'succeeded','update with an empty set archives all specific profiles');
-- P. re-select a previously-archived seniority (new active row per 2B).
select is((public.update_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101',(select id from t where name='pp'),
    'PP',null,null,'analyst','active',40,'on_site','clt','none', '{}'::uuid[])) ->> 'status',
  'succeeded','pp: archive JR');
select is((public.update_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101',(select id from t where name='pp'),
    'PP',null,null,'analyst','active',40,'on_site','clt','none',
    array['a6000000-0000-4000-8000-000000000201']::uuid[])) ->> 'status',
  'succeeded','pp: re-select JR');
-- Q. invalid desired set rolls back the Position field change too.
select throws_ok($$select public.update_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101',(select id from t where name='pq'),
    'PQ Renamed',null,null,'analyst','active',40,'on_site','clt','none',
    array['a6000000-0000-4000-8000-000000000209']::uuid[])$$,
  'P0002','SENIORITY_LEVEL_NOT_FOUND','update with an archived seniority is rejected');

-- U. employee is denied on both boundaries.
select set_config('request.jwt.claims','{"sub":"a6000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.create_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101','Denied',null,null,
    'analyst','active',40,'on_site','clt','none','cr-den', '{}'::uuid[])$$,
  '42501','TENANT_AUTHORIZATION_DENIED','employee cannot atomically create a position');
reset role;

-- Historical person on PH's JR profile, then archive it via update.
insert into public.people (id, company_id, full_name, status, position_id, position_seniority_profile_id)
select 'a6000000-0000-4000-8000-000000000501','a6000000-0000-4000-8000-000000000101','Pessoa Historica','active',
  (select id from t where name='ph'),
  (select id from public.position_seniority_profiles where position_id=(select id from t where name='ph')
     and seniority_level_id='a6000000-0000-4000-8000-000000000201' and active);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a6000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.update_tenant_position_with_seniorities_v1('a6000000-0000-4000-8000-000000000101',(select id from t where name='ph'),
    'PH',null,null,'analyst','active',40,'on_site','clt','none', '{}'::uuid[])) ->> 'status',
  'succeeded','ph: archive the assigned seniority');
reset role;

-- ---------------------------------------------------------------------------
-- State assertions (setup role — direct reads).
-- ---------------------------------------------------------------------------
-- Helper predicate for "active specific seniority set" of a position.
-- A/C. Pa has exactly {JR,PL,SR} active specific.
select is((select array_agg(seniority_level_id order by seniority_level_id)
   from public.position_seniority_profiles
   where position_id=(select id from t where name='pa') and seniority_level_id is not null and active),
  array['a6000000-0000-4000-8000-000000000201','a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[],
  'A/C: create applied exactly the selected specific seniorities');
-- B. exactly one active base profile.
select is((select count(*)::int from public.position_seniority_profiles
   where position_id=(select id from t where name='pa') and seniority_level_id is null and active),
  1,'B: exactly one active base profile');
-- D. empty selection: base only, no specific.
select is((select count(*)::int from public.position_seniority_profiles
   where position_id=(select id from t where name='pd') and seniority_level_id is not null and active),
  0,'D: empty selection applied no specific profiles');
select is((select count(*)::int from public.position_seniority_profiles
   where position_id=(select id from t where name='pd') and seniority_level_id is null and active),
  1,'D: empty selection still has the base profile');
-- E/F/G/K. failed creates left no residue: only the successfully-created positions exist.
select is((select count(*)::int from public.positions where company_id='a6000000-0000-4000-8000-000000000101'
   and name in ('Dup','Arch','Bad','Denied')),
  0,'E/F/G/K: rejected creates left no Position residue');
-- J. Activity: one position.created + one seniority-profile.created per applied seniority (Pa).
select is((select count(*)::int from public.activity_events
   where entity_id=(select id from t where name='pa') and activity_type='position.created'),
  1,'J: one position.created for the atomic create');
select is((select count(*)::int from public.activity_events
   where entity_id=(select id from t where name='pa') and activity_type='position_seniority_profile.created'),
  3,'J: one position_seniority_profile.created per applied seniority');
-- H. idempotent retry created no second position / no extra profiles for pk.
select is((select count(*)::int from public.positions where company_id='a6000000-0000-4000-8000-000000000101' and name='Idem'),
  1,'H: idempotent retry created exactly one position');
select is((select count(*)::int from public.position_seniority_profiles
   where position_id=(select id from t where name='pk') and seniority_level_id is not null and active),
  3,'H: idempotent retry did not duplicate specific profiles');

-- L. pl -> {JR,PL,SR}.
select is((select array_agg(seniority_level_id order by seniority_level_id)
   from public.position_seniority_profiles where position_id=(select id from t where name='pl') and seniority_level_id is not null and active),
  array['a6000000-0000-4000-8000-000000000201','a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[],
  'L: update added only the new seniorities');
-- M. pm -> {PL,SR}; JR archived.
select is((select array_agg(seniority_level_id order by seniority_level_id)
   from public.position_seniority_profiles where position_id=(select id from t where name='pm') and seniority_level_id is not null and active),
  array['a6000000-0000-4000-8000-000000000202','a6000000-0000-4000-8000-000000000203']::uuid[],
  'M: update archived only the removed seniority');
select is((select active from public.position_seniority_profiles
   where position_id=(select id from t where name='pm') and seniority_level_id='a6000000-0000-4000-8000-000000000201'),
  false,'M: the removed JR profile is archived, not deleted');
-- N. unchanged: still {PL,SR}, exactly two specific rows total (no churn).
select is((select count(*)::int from public.position_seniority_profiles
   where position_id=(select id from t where name='pn') and seniority_level_id is not null),
  2,'N: an unchanged set produced no profile churn');
-- O. empty: no active specific, base remains.
select is((select count(*)::int from public.position_seniority_profiles
   where position_id=(select id from t where name='po') and seniority_level_id is not null and active),
  0,'O: empty set archived all specific profiles');
select is((select count(*)::int from public.position_seniority_profiles
   where position_id=(select id from t where name='po') and seniority_level_id is null and active),
  1,'O/R: the base profile survives an empty set');
-- P. re-select archived JR: exactly one ACTIVE JR + two JR rows total (history kept).
select is((select count(*)::int from public.position_seniority_profiles
   where position_id=(select id from t where name='pp') and seniority_level_id='a6000000-0000-4000-8000-000000000201' and active),
  1,'P: re-selecting an archived seniority yields one active row');
select is((select count(*)::int from public.position_seniority_profiles
   where position_id=(select id from t where name='pp') and seniority_level_id='a6000000-0000-4000-8000-000000000201'),
  2,'P: the previously-archived row is preserved as history');
-- Q. invalid desired set rolled back the Position rename and left {PL} intact.
select is((select name from public.positions where id=(select id from t where name='pq')),
  'PQ','Q: the rejected update rolled back the Position field change');
select is((select array_agg(seniority_level_id) from public.position_seniority_profiles
   where position_id=(select id from t where name='pq') and seniority_level_id is not null and active),
  array['a6000000-0000-4000-8000-000000000202']::uuid[],
  'Q: the rejected update left the seniority set unchanged');
-- R. base profile is active for every scenario position.
select is((select count(*)::int from public.position_seniority_profiles pr
   where pr.company_id='a6000000-0000-4000-8000-000000000101' and pr.seniority_level_id is null and pr.active
     and pr.position_id in (select id from t)),
  (select count(*)::int from t),'R: every configured position keeps exactly one active base profile');
-- S. historical Person still references the now-archived profile (readable/coherent).
select is((select position_seniority_profile_id from public.people where id='a6000000-0000-4000-8000-000000000501'),
  (select id from public.position_seniority_profiles where position_id=(select id from t where name='ph')
     and seniority_level_id='a6000000-0000-4000-8000-000000000201'),
  'S: the historical person still references its (now archived) profile');
select is((select active from public.position_seniority_profiles
   where id=(select position_seniority_profile_id from public.people where id='a6000000-0000-4000-8000-000000000501')),
  false,'S: that referenced profile is archived, preserved as history');
-- T. no duplicate position.updated per scenario position (one per update call).
select is((select count(*)::int from public.activity_events
   where entity_id=(select id from t where name='pm') and activity_type='position.updated'),
  1,'T: exactly one position.updated per update call (pm)');

select * from finish();
rollback;
