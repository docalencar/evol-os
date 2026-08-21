begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ===========================================================================
-- 0107 — Trusted Organization Sync Execution boundary.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- A. receipts column: exists, jsonb, NOT NULL, defaulted.
-- ---------------------------------------------------------------------------
select has_column('public','organization_sync_timeline','receipts',
  'A: receipts column exists');
select col_type_is('public','organization_sync_timeline','receipts','jsonb',
  'A: receipts is jsonb');
select col_not_null('public','organization_sync_timeline','receipts',
  'A: receipts is NOT NULL');
select col_has_default('public','organization_sync_timeline','receipts',
  'A: receipts has a default');

-- ---------------------------------------------------------------------------
-- B. execution identity columns exist.
-- ---------------------------------------------------------------------------
select has_column('public','organization_sync_timeline','execution_id',
  'B: execution_id column exists');
select col_type_is('public','organization_sync_timeline','execution_id','text',
  'B: execution_id is text');
select has_column('public','organization_sync_timeline','intent_fingerprint',
  'B: intent_fingerprint column exists');
select col_type_is('public','organization_sync_timeline','intent_fingerprint','text',
  'B: intent_fingerprint is text');

-- ---------------------------------------------------------------------------
-- C. unique partial execution index exists and is unique.
-- ---------------------------------------------------------------------------
select has_index('public','organization_sync_timeline',
  'organization_sync_timeline_company_execution_key',
  'C: unique execution index exists');
select index_is_unique('public','organization_sync_timeline',
  'organization_sync_timeline_company_execution_key',
  'C: execution index is unique');

-- ---------------------------------------------------------------------------
-- F. RPC execute grants: authenticated only.
-- ---------------------------------------------------------------------------
select has_function('public','apply_tenant_organization_sync_plan_v1',
  array['uuid','text','jsonb'], 'F: execution boundary exists');
select ok(has_function_privilege('authenticated',
  'public.apply_tenant_organization_sync_plan_v1(uuid,text,jsonb)','execute'),
  'F: authenticated may execute the boundary');
select ok(not has_function_privilege('anon',
  'public.apply_tenant_organization_sync_plan_v1(uuid,text,jsonb)','execute'),
  'F: anon may not execute the boundary');
select ok(not has_function_privilege('service_role',
  'public.apply_tenant_organization_sync_plan_v1(uuid,text,jsonb)','execute'),
  'F: service_role may not execute the boundary');

-- ---------------------------------------------------------------------------
-- Fixtures.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('b7000000-0000-4000-8000-000000000001','owner@example.com'),
  ('b7000000-0000-4000-8000-000000000002','hr@example.com'),
  ('b7000000-0000-4000-8000-000000000005','employee@example.com');
insert into public.companies (id, name, slug) values
  ('b7000000-0000-4000-8000-000000000101','Sync Co','sync-co');
insert into public.company_members (id, company_id, user_id, role, status) values
  ('b7000000-0000-4000-8000-000000000111','b7000000-0000-4000-8000-000000000101','b7000000-0000-4000-8000-000000000001','owner','active'),
  ('b7000000-0000-4000-8000-000000000112','b7000000-0000-4000-8000-000000000101','b7000000-0000-4000-8000-000000000002','hr','active'),
  ('b7000000-0000-4000-8000-000000000115','b7000000-0000-4000-8000-000000000101','b7000000-0000-4000-8000-000000000005','employee','active');

create temporary table res(k text, v jsonb) on commit drop;
grant select, insert on res to authenticated;

-- ---------------------------------------------------------------------------
-- D/E. Direct DML as authenticated stays denied (no table grants added).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b7000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select throws_ok($$
  insert into public.organization_sync_timeline
    (company_id, started_at, finished_at, duration_ms, applied_items, skipped_items,
     failed_items, entity_summary, operation_summary, warnings, errors, created_by)
  values ('b7000000-0000-4000-8000-000000000101', now(), now(), 0, 0, 0, 0,
     '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb,
     'b7000000-0000-4000-8000-000000000001')
$$, '42501', NULL, 'D: direct authenticated Timeline INSERT is denied');

select throws_ok($$
  insert into public.departments (company_id, name)
  values ('b7000000-0000-4000-8000-000000000101','Direct Dep')
$$, '42501', NULL, 'E: direct authenticated entity DML is denied');

-- ---------------------------------------------------------------------------
-- I/P. Department create through the boundary.
-- ---------------------------------------------------------------------------
insert into res values ('e-dept', public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101', 'e-dept',
  '[{"id":"i1","entity":"department","operation":"create","desired":{"name":"Engenharia"}}]'::jsonb
));
select is((select v->>'status' from res where k='e-dept'), 'succeeded',
  'I: department create succeeds');
select is((select (v->>'appliedItems')::int from res where k='e-dept'), 1,
  'I: one applied item');
select is((select jsonb_array_length(v->'receipts') from res where k='e-dept'), 1,
  'P: an applied receipt is produced');
select is((select v->'receipts'->0->>'entity' from res where k='e-dept'), 'department',
  'P: receipt carries the entity');
select isnt((select v->'receipts'->0->>'entityId' from res where k='e-dept'), null,
  'P: receipt carries the created entity id');

-- ---------------------------------------------------------------------------
-- J/K/L. Dependency chain department -> position -> employee in one execution.
-- ---------------------------------------------------------------------------
insert into res values ('e-chain', public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101', 'e-chain',
  '[
    {"id":"c1","entity":"department","operation":"create","desired":{"name":"Produto"}},
    {"id":"c2","entity":"position","operation":"create","desired":{"name":"PM","department":"Produto"}},
    {"id":"c3","entity":"employee","operation":"create","desired":{"fullName":"Ana Lima","email":"ana@example.com","position":"PM"}}
  ]'::jsonb
));
select is((select (v->>'appliedItems')::int from res where k='e-chain'), 3,
  'L: department -> position -> employee all applied in order');
select is((select (v->>'failedItems')::int from res where k='e-chain'), 0,
  'L: no failures in the dependency chain');

-- ---------------------------------------------------------------------------
-- O/Q. Failed dependency isolates: department commits, position fails.
-- ---------------------------------------------------------------------------
insert into res values ('e-faildep', public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101', 'e-faildep',
  '[
    {"id":"f1","entity":"department","operation":"create","desired":{"name":"Vendas"}},
    {"id":"f2","entity":"position","operation":"create","desired":{"name":"Rep","department":"Inexistente"}}
  ]'::jsonb
));
select is((select (v->>'appliedItems')::int from res where k='e-faildep'), 1,
  'O: the good department item is applied');
select is((select (v->>'failedItems')::int from res where k='e-faildep'), 1,
  'O: the bad position item fails on its own');
select is((select v->'errors'->0->>'code' from res where k='e-faildep'),
  'SYNC_DEPENDENCY_NOT_FOUND', 'Q: missing dependency -> SYNC_DEPENDENCY_NOT_FOUND');

-- ---------------------------------------------------------------------------
-- S. Unsupported operation preserves semantics (recorded, not applied).
-- ---------------------------------------------------------------------------
insert into res values ('e-unsup', public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101', 'e-unsup',
  '[{"id":"u1","entity":"department","operation":"update","desired":{"name":"Engenharia"}}]'::jsonb
));
select is((select (v->>'failedItems')::int from res where k='e-unsup'), 1,
  'S: an unsupported operation is recorded as failed');
select is((select v->'errors'->0->>'code' from res where k='e-unsup'),
  'SYNC_UNSUPPORTED_OPERATION', 'S: unsupported operation -> SYNC_UNSUPPORTED_OPERATION');

-- ---------------------------------------------------------------------------
-- G. HR is allowed on the boundary.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims','{"sub":"b7000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into res values ('e-hr', public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101', 'e-hr',
  '[{"id":"h1","entity":"department","operation":"create","desired":{"name":"RH Teste"}}]'::jsonb
));
select is((select v->>'status' from res where k='e-hr'), 'succeeded',
  'G: an HR member may execute the boundary');

-- ---------------------------------------------------------------------------
-- H. A plain employee is denied.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims','{"sub":"b7000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101','e-emp',
  '[{"id":"x","entity":"department","operation":"create","desired":{"name":"Nope"}}]'::jsonb)$$,
  '42501', 'TENANT_AUTHORIZATION_DENIED', 'H: a plain employee is denied');

-- ---------------------------------------------------------------------------
-- U. Same execution_id + same intent -> idempotent retry (no duplicates).
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims','{"sub":"b7000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into res values ('e-dept-retry', public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101', 'e-dept',
  '[{"id":"i1","entity":"department","operation":"create","desired":{"name":"Engenharia"}}]'::jsonb
));
select is((select v->>'status' from res where k='e-dept-retry'), 'idempotent_retry',
  'U: same execution_id + same intent returns idempotent_retry');
select is((select v->>'timelineId' from res where k='e-dept-retry'),
  (select v->>'timelineId' from res where k='e-dept'),
  'U: retry returns the same stored timeline id');

-- ---------------------------------------------------------------------------
-- Order-independent fingerprint: a reordered identical intent is a retry.
-- ---------------------------------------------------------------------------
insert into res values ('e-order-1', public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101', 'e-order',
  '[
    {"id":"o1","entity":"department","operation":"create","desired":{"name":"Alfa"}},
    {"id":"o2","entity":"department","operation":"create","desired":{"name":"Beta"}}
  ]'::jsonb
));
insert into res values ('e-order-2', public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101', 'e-order',
  '[
    {"id":"o2","entity":"department","operation":"create","desired":{"name":"Beta"}},
    {"id":"o1","entity":"department","operation":"create","desired":{"name":"Alfa"}}
  ]'::jsonb
));
select is((select v->>'status' from res where k='e-order-2'), 'idempotent_retry',
  'Fingerprint is order-independent: reordered identical items retry');

-- ---------------------------------------------------------------------------
-- V. Same execution_id + changed intent -> SYNC_EXECUTION_CONFLICT.
-- ---------------------------------------------------------------------------
select throws_ok($$select public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101','e-dept',
  '[{"id":"i1","entity":"department","operation":"create","desired":{"name":"EngenhariaX"}}]'::jsonb)$$,
  '23505', 'SYNC_EXECUTION_CONFLICT', 'V: changed intent under the same identity conflicts');

-- ---------------------------------------------------------------------------
-- Accent/case-insensitive dependency resolution (normalization).
-- ---------------------------------------------------------------------------
insert into res values ('e-acc1', public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101', 'e-acc1',
  '[{"id":"a1","entity":"department","operation":"create","desired":{"name":"Operações"}}]'::jsonb
));
insert into res values ('e-acc2', public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101', 'e-acc2',
  '[{"id":"a2","entity":"position","operation":"create","desired":{"name":"Analista","department":"operacoes"}}]'::jsonb
));
select is((select (v->>'appliedItems')::int from res where k='e-acc2'), 1,
  'Normalization: "operacoes" resolves the "Operações" department');
select is((select (v->>'failedItems')::int from res where k='e-acc2'), 0,
  'Normalization: no dependency failure despite accent/case');

reset role;

-- ---------------------------------------------------------------------------
-- M/N. Base-only position and base-profile person (setup-role reads).
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.position_seniority_profiles pr
   join public.positions p on p.id = pr.position_id
   where p.company_id='b7000000-0000-4000-8000-000000000101' and p.name='PM'
     and pr.seniority_level_id is null and pr.active),
  1, 'M: the imported position has exactly one active base profile');
select is((select count(*)::int from public.position_seniority_profiles pr
   join public.positions p on p.id = pr.position_id
   where p.company_id='b7000000-0000-4000-8000-000000000101' and p.name='PM'
     and pr.seniority_level_id is not null and pr.active),
  0, 'M: the imported position has no specific seniorities');
select is((select pe.position_seniority_profile_id from public.people pe
   where pe.company_id='b7000000-0000-4000-8000-000000000101' and pe.full_name='Ana Lima'),
  (select pr.id from public.position_seniority_profiles pr
   join public.positions p on p.id = pr.position_id
   where p.company_id='b7000000-0000-4000-8000-000000000101' and p.name='PM'
     and pr.seniority_level_id is null and pr.active),
  'N: the person resolved the position active base profile');

-- ---------------------------------------------------------------------------
-- O (state). The failed position left no residue; the good department stuck.
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.departments
   where company_id='b7000000-0000-4000-8000-000000000101' and name='Vendas' and deleted_at is null),
  1, 'O: the successful department committed');
select is((select count(*)::int from public.positions
   where company_id='b7000000-0000-4000-8000-000000000101' and name='Rep' and deleted_at is null),
  0, 'O: the failed position wrote nothing');

-- ---------------------------------------------------------------------------
-- T. Timeline row matches the committed outcome for the chain execution.
-- ---------------------------------------------------------------------------
select is((select applied_items from public.organization_sync_timeline
   where company_id='b7000000-0000-4000-8000-000000000101' and execution_id='e-chain'),
  3, 'T: timeline applied_items matches');
select is((select failed_items from public.organization_sync_timeline
   where company_id='b7000000-0000-4000-8000-000000000101' and execution_id='e-chain'),
  0, 'T: timeline failed_items matches');
select is((select jsonb_array_length(receipts) from public.organization_sync_timeline
   where company_id='b7000000-0000-4000-8000-000000000101' and execution_id='e-chain'),
  3, 'T: timeline receipts count matches');
select is((select jsonb_array_length(errors) from public.organization_sync_timeline
   where company_id='b7000000-0000-4000-8000-000000000101' and execution_id='e-faildep'),
  1, 'T: timeline errors count matches for the partial execution');
-- Full summary scaffold is present (every entity + operation key).
select is((select count(*)::int from jsonb_object_keys(
   (select entity_summary from public.organization_sync_timeline
    where company_id='b7000000-0000-4000-8000-000000000101' and execution_id='e-chain'))),
  4, 'T: entity_summary carries all four entity keys');
select is((select count(*)::int from jsonb_object_keys(
   (select operation_summary from public.organization_sync_timeline
    where company_id='b7000000-0000-4000-8000-000000000101' and execution_id='e-chain'))),
  7, 'T: operation_summary carries all seven operation keys');

-- ---------------------------------------------------------------------------
-- U (state). The retried execution neither duplicated the row nor the entity.
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.organization_sync_timeline
   where company_id='b7000000-0000-4000-8000-000000000101' and execution_id='e-dept'),
  1, 'U: exactly one timeline row for the retried execution');
select is((select count(*)::int from public.departments
   where company_id='b7000000-0000-4000-8000-000000000101' and name='Engenharia' and deleted_at is null),
  1, 'U: the retried execution created no duplicate department');

-- ---------------------------------------------------------------------------
-- V (state). The conflicting intent changed nothing.
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.departments
   where company_id='b7000000-0000-4000-8000-000000000101' and name='EngenhariaX'),
  0, 'V: the conflicting intent created no department');

-- ---------------------------------------------------------------------------
-- R. Unknown nested failure becomes SYNC_ITEM_FAILED; raw text never leaks.
--    A test-only trigger raises a non-allow-listed message from inside a write.
-- ---------------------------------------------------------------------------
create function pg_temp.raise_unknown_on_department()
returns trigger language plpgsql as $$
begin
  raise exception using errcode = 'P0001', message = 'RAW_INTERNAL_XYZ_DO_NOT_LEAK';
end;
$$;
create trigger zzz_test_raise_unknown
  before insert on public.departments
  for each row execute function pg_temp.raise_unknown_on_department();

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b7000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into res values ('e-unknown', public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101', 'e-unknown',
  '[{"id":"k1","entity":"department","operation":"create","desired":{"name":"Trigger Dep"}}]'::jsonb
));
reset role;

select is((select v->'errors'->0->>'code' from res where k='e-unknown'),
  'SYNC_ITEM_FAILED', 'R: an unknown nested failure classifies as SYNC_ITEM_FAILED');
select ok((select (v::text) not like '%RAW_INTERNAL_XYZ_DO_NOT_LEAK%' from res where k='e-unknown'),
  'R: the raw SQLERRM never appears in the returned payload');
select ok((select not exists (
    select 1 from public.organization_sync_timeline
    where execution_id='e-unknown' and (errors::text like '%RAW_INTERNAL_XYZ_DO_NOT_LEAK%'))),
  'R: the raw SQLERRM never appears in the stored Timeline');

drop trigger zzz_test_raise_unknown on public.departments;

-- ---------------------------------------------------------------------------
-- W. Timeline failure rolls back ALL successful entity writes.
--    A test-only BEFORE INSERT trigger on the Timeline forces the failure.
-- ---------------------------------------------------------------------------
create function pg_temp.fail_timeline_insert()
returns trigger language plpgsql as $$
begin
  raise exception using errcode = 'P0001', message = 'TIMELINE_WRITE_FORCED_FAILURE';
end;
$$;
create trigger zzz_test_fail_timeline
  before insert on public.organization_sync_timeline
  for each row execute function pg_temp.fail_timeline_insert();

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b7000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.apply_tenant_organization_sync_plan_v1(
  'b7000000-0000-4000-8000-000000000101','e-rollback',
  '[{"id":"w1","entity":"department","operation":"create","desired":{"name":"RollbackDep"}}]'::jsonb)$$,
  'P0001', 'TIMELINE_WRITE_FORCED_FAILURE', 'W: a Timeline failure aborts the whole execution');
reset role;

select is((select count(*)::int from public.departments
   where company_id='b7000000-0000-4000-8000-000000000101' and name='RollbackDep'),
  0, 'W: the successful entity write rolled back with the Timeline failure');
select is((select count(*)::int from public.organization_sync_timeline
   where company_id='b7000000-0000-4000-8000-000000000101' and execution_id='e-rollback'),
  0, 'W: no Timeline row survived the forced failure');

drop trigger zzz_test_fail_timeline on public.organization_sync_timeline;

select * from finish();
rollback;
