-- E5-DB1 — trusted Assessment Feedback mutation boundary (migration 0128).
--
-- Proves the five purpose-bound functions ARE the boundary: identities derived,
-- state machine server-enforced, tenant integrity physical, audit atomic and
-- private, direct DML closed across the whole Feedback aggregate, and foreign
-- and nonexistent selectors externally indistinguishable.
begin; create extension if not exists pgtap with schema extensions; set local search_path=extensions,public,pg_temp; select plan(145);

-- ===========================================================================
-- 1. Function identity, security posture and EXECUTE
-- ===========================================================================
select has_function('public','create_assessment_feedback_v1',array['uuid','text']);
select has_function('public','reply_feedback_v1',array['uuid','text']);
select has_function('public','acknowledge_feedback_v1',array['uuid']);
select has_function('public','close_feedback_v1',array['uuid']);
select has_function('public','archive_feedback_v1',array['uuid']);

select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_assessment_feedback_v1'),1::bigint,'create namecount 1');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='reply_feedback_v1'),1::bigint,'reply namecount 1');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='acknowledge_feedback_v1'),1::bigint,'acknowledge namecount 1');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='close_feedback_v1'),1::bigint,'close namecount 1');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='archive_feedback_v1'),1::bigint,'archive namecount 1');

select is((select bool_and(p.prosecdef) from pg_proc p where p.oid in ('public.create_assessment_feedback_v1(uuid,text)'::regprocedure,'public.reply_feedback_v1(uuid,text)'::regprocedure,'public.acknowledge_feedback_v1(uuid)'::regprocedure,'public.close_feedback_v1(uuid)'::regprocedure,'public.archive_feedback_v1(uuid)'::regprocedure)),true,'all five SECURITY DEFINER');
select is((select bool_and(p.provolatile='v') from pg_proc p where p.oid in ('public.create_assessment_feedback_v1(uuid,text)'::regprocedure,'public.reply_feedback_v1(uuid,text)'::regprocedure,'public.acknowledge_feedback_v1(uuid)'::regprocedure,'public.close_feedback_v1(uuid)'::regprocedure,'public.archive_feedback_v1(uuid)'::regprocedure)),true,'all five VOLATILE');
select is((select bool_and(p.proconfig=array['search_path=public, pg_temp']) from pg_proc p where p.oid in ('public.create_assessment_feedback_v1(uuid,text)'::regprocedure,'public.reply_feedback_v1(uuid,text)'::regprocedure,'public.acknowledge_feedback_v1(uuid)'::regprocedure,'public.close_feedback_v1(uuid)'::regprocedure,'public.archive_feedback_v1(uuid)'::regprocedure)),true,'all five search_path hardened');

select ok(has_function_privilege('authenticated','public.create_assessment_feedback_v1(uuid,text)','execute'),'create: authenticated execute');
select ok(has_function_privilege('authenticated','public.reply_feedback_v1(uuid,text)','execute'),'reply: authenticated execute');
select ok(has_function_privilege('authenticated','public.acknowledge_feedback_v1(uuid)','execute'),'acknowledge: authenticated execute');
select ok(has_function_privilege('authenticated','public.close_feedback_v1(uuid)','execute'),'close: authenticated execute');
select ok(has_function_privilege('authenticated','public.archive_feedback_v1(uuid)','execute'),'archive: authenticated execute');
select ok(not has_function_privilege('anon','public.create_assessment_feedback_v1(uuid,text)','execute'),'create: anon denied');
select ok(not has_function_privilege('public','public.create_assessment_feedback_v1(uuid,text)','execute'),'create: PUBLIC denied');
select ok(not has_function_privilege('service_role','public.create_assessment_feedback_v1(uuid,text)','execute'),'create: service_role denied');
select ok(not has_function_privilege('anon','public.reply_feedback_v1(uuid,text)','execute'),'reply: anon denied');
select ok(not has_function_privilege('public','public.reply_feedback_v1(uuid,text)','execute'),'reply: PUBLIC denied');
select ok(not has_function_privilege('service_role','public.reply_feedback_v1(uuid,text)','execute'),'reply: service_role denied');
select ok(not has_function_privilege('anon','public.acknowledge_feedback_v1(uuid)','execute'),'acknowledge: anon denied');
select ok(not has_function_privilege('service_role','public.acknowledge_feedback_v1(uuid)','execute'),'acknowledge: service_role denied');
select ok(not has_function_privilege('anon','public.close_feedback_v1(uuid)','execute'),'close: anon denied');
select ok(not has_function_privilege('service_role','public.close_feedback_v1(uuid)','execute'),'close: service_role denied');
select ok(not has_function_privilege('anon','public.archive_feedback_v1(uuid)','execute'),'archive: anon denied');
select ok(not has_function_privilege('service_role','public.archive_feedback_v1(uuid)','execute'),'archive: service_role denied');

-- ===========================================================================
-- 2. Direct DML closure across the whole aggregate (F12)
-- ===========================================================================
select ok(not has_table_privilege('authenticated','public.feedback_threads','insert'),'threads: authenticated insert revoked');
select ok(not has_table_privilege('authenticated','public.feedback_threads','update'),'threads: authenticated update revoked');
select ok(not has_table_privilege('authenticated','public.feedback_threads','delete'),'threads: authenticated delete revoked');
select ok(not has_table_privilege('authenticated','public.feedback_messages','insert'),'messages: authenticated insert revoked');
select ok(not has_table_privilege('authenticated','public.feedback_messages','update'),'messages: authenticated update revoked');
select ok(not has_table_privilege('authenticated','public.feedback_messages','delete'),'messages: authenticated delete revoked');
select ok(not has_table_privilege('authenticated','public.feedback_acknowledgements','insert'),'acknowledgements: authenticated insert revoked');
select ok(not has_table_privilege('authenticated','public.feedback_acknowledgements','update'),'acknowledgements: authenticated update revoked');
select ok(not has_table_privilege('authenticated','public.feedback_acknowledgements','delete'),'acknowledgements: authenticated delete revoked');
select ok(not has_table_privilege('authenticated','public.feedback_attachments','insert'),'attachments: authenticated insert revoked');
select ok(not has_table_privilege('authenticated','public.feedback_attachments','update'),'attachments: authenticated update revoked');
select ok(not has_table_privilege('authenticated','public.feedback_attachments','delete'),'attachments: authenticated delete revoked');
select ok(not has_table_privilege('authenticated','public.feedback_mentions','insert'),'mentions: authenticated insert revoked');
select ok(not has_table_privilege('authenticated','public.feedback_mentions','update'),'mentions: authenticated update revoked');
select ok(not has_table_privilege('authenticated','public.feedback_mentions','delete'),'mentions: authenticated delete revoked');
select ok(not has_table_privilege('anon','public.feedback_threads','insert'),'threads: anon insert revoked');
select ok(not has_table_privilege('anon','public.feedback_attachments','insert'),'attachments: anon insert revoked');
select ok(not has_table_privilege('anon','public.feedback_mentions','insert'),'mentions: anon insert revoked');

-- No write policy survives on any of the five relations.
select is((select count(*) from pg_policies where schemaname='public' and tablename in ('feedback_threads','feedback_messages','feedback_acknowledgements','feedback_attachments','feedback_mentions') and cmd in ('INSERT','UPDATE','DELETE','ALL')),0::bigint,'no write policy remains on the Feedback aggregate');
select is((select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('feedback_threads','feedback_messages','feedback_acknowledgements','feedback_attachments','feedback_mentions')),true,'RLS still enabled on the aggregate');

-- ===========================================================================
-- 3. Bridge, uniqueness and composite foreign keys
-- ===========================================================================
select has_column('public','feedback_threads','assessment_response_id','modern origin bridge column exists');
select ok((select not attnotnull from pg_attribute where attrelid='public.feedback_threads'::regclass and attname='assessment_response_id'),'bridge column is nullable');
select has_column('public','feedback_threads','assessment_id','legacy origin column is preserved');
select is((select indexdef from pg_indexes where schemaname='public' and indexname='feedback_threads_company_assessment_response_key'),'CREATE UNIQUE INDEX feedback_threads_company_assessment_response_key ON public.feedback_threads USING btree (company_id, assessment_response_id) WHERE (assessment_response_id IS NOT NULL)','origin uniqueness is physical and partial');
select is((select count(*) from pg_constraint where conrelid='public.feedback_threads'::regclass and conname in ('feedback_threads_assessment_response_company_fkey','feedback_threads_sender_company_fkey','feedback_threads_receiver_company_fkey') and convalidated),3::bigint,'thread composite FKs validated');
select is((select count(*) from pg_constraint where conrelid='public.feedback_messages'::regclass and conname in ('feedback_messages_thread_company_fkey','feedback_messages_author_company_fkey') and convalidated),2::bigint,'message composite FKs validated');
select is((select count(*) from pg_constraint where conrelid='public.feedback_acknowledgements'::regclass and conname in ('feedback_acknowledgements_thread_company_fkey','feedback_acknowledgements_employee_company_fkey') and convalidated),2::bigint,'acknowledgement composite FKs validated');
select is((select count(*) from pg_constraint where conname in ('feedback_threads_sender_employee_id_fkey','feedback_threads_receiver_employee_id_fkey','feedback_messages_thread_id_fkey','feedback_messages_author_employee_id_fkey','feedback_acknowledgements_thread_id_fkey','feedback_acknowledgements_employee_id_fkey')),0::bigint,'weaker simple FKs are gone');
select ok((select exists(select 1 from pg_constraint where conrelid='public.assessment_responses'::regclass and conname='assessment_responses_id_company_key')),'response candidate key present');

-- ===========================================================================
-- 4. Fixtures
-- ===========================================================================
insert into auth.users(id,email) values
 ('88000000-0000-4000-8000-000000000001','fb-evaluator@example.com'),
 ('88000000-0000-4000-8000-000000000002','fb-evaluatee@example.com'),
 ('88000000-0000-4000-8000-000000000003','fb-other@example.com'),
 ('88000000-0000-4000-8000-000000000004','fb-owner@example.com'),
 ('88000000-0000-4000-8000-000000000005','fb-hr@example.com'),
 ('88000000-0000-4000-8000-000000000006','fb-inactive@example.com'),
 ('88000000-0000-4000-8000-000000000007','fb-foreign-a@example.com'),
 ('88000000-0000-4000-8000-000000000008','fb-foreign-b@example.com'),
 ('88000000-0000-4000-8000-000000000009','fb-foreign-owner@example.com');

insert into public.companies(id,name,slug) values
 ('88000000-0000-4000-8000-000000000101','Feedback A','feedback-a'),
 ('88000000-0000-4000-8000-000000000102','Feedback B','feedback-b');

-- `enforce_company_member_owner_invariants` (0071, BEFORE INSERT per row) lets
-- the FIRST membership of a company through as the bootstrap owner and then
-- requires an active owner to authorize any further owner administration. So the
-- owner row must be each company's first row — the shape every mature suite in
-- this repository already uses. Tenant B gets a real active owner too: an
-- adversarial tenant still has to be a structurally valid one.
insert into public.company_members(id,company_id,user_id,role,status) values
 ('88000000-0000-4000-8000-000000000114','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000004','owner','active'),
 ('88000000-0000-4000-8000-000000000111','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000001','manager','active'),
 ('88000000-0000-4000-8000-000000000112','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000002','employee','active'),
 ('88000000-0000-4000-8000-000000000113','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000003','employee','active'),
 ('88000000-0000-4000-8000-000000000115','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000005','hr','active'),
 ('88000000-0000-4000-8000-000000000116','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000006','manager','inactive'),
 ('88000000-0000-4000-8000-000000000119','88000000-0000-4000-8000-000000000102','88000000-0000-4000-8000-000000000009','owner','active'),
 ('88000000-0000-4000-8000-000000000117','88000000-0000-4000-8000-000000000102','88000000-0000-4000-8000-000000000007','manager','active'),
 ('88000000-0000-4000-8000-000000000118','88000000-0000-4000-8000-000000000102','88000000-0000-4000-8000-000000000008','employee','active');

insert into public.people(id,company_id,user_id,full_name,status) values
 ('88000000-0000-4000-8000-000000000201','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000001','Evaluator','active'),
 ('88000000-0000-4000-8000-000000000202','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000002','Evaluatee','active'),
 ('88000000-0000-4000-8000-000000000203','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000003','Other','active'),
 ('88000000-0000-4000-8000-000000000204','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000004','Owner','active'),
 ('88000000-0000-4000-8000-000000000205','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000005','HR','active'),
 ('88000000-0000-4000-8000-000000000206','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000006','Inactive Member','active'),
 ('88000000-0000-4000-8000-000000000207','88000000-0000-4000-8000-000000000102','88000000-0000-4000-8000-000000000007','Foreign Evaluator','active'),
 ('88000000-0000-4000-8000-000000000208','88000000-0000-4000-8000-000000000102','88000000-0000-4000-8000-000000000008','Foreign Evaluatee','active'),
 ('88000000-0000-4000-8000-000000000209','88000000-0000-4000-8000-000000000102','88000000-0000-4000-8000-000000000009','Foreign Owner','active');

insert into public.assessment_templates(id,company_id,name,type) values
 ('88000000-0000-4000-8000-000000000301','88000000-0000-4000-8000-000000000101','Template A','annual'),
 ('88000000-0000-4000-8000-000000000302','88000000-0000-4000-8000-000000000102','Template B','annual');

insert into public.assessment_cycles(id,company_id,name,start_date,end_date) values
 ('88000000-0000-4000-8000-000000000401','88000000-0000-4000-8000-000000000101','Ciclo Confidencial A','2026-01-01','2026-12-31'),
 ('88000000-0000-4000-8000-000000000402','88000000-0000-4000-8000-000000000102','Ciclo B','2026-01-01','2026-12-31');

-- Since 0114 a modern response MUST carry its execution snapshot:
-- `assessment_execution_snapshot_id` is NOT NULL and the composite key
-- (snapshot, cycle, company) has to resolve against
-- `assessment_execution_snapshots(id, assessment_cycle_id, company_id)`. One
-- snapshot per cycle — the table enforces `unique (assessment_cycle_id,
-- company_id)` — and each snapshot belongs to its own tenant, so Tenant A and
-- Tenant B never share one. Sections and questions are omitted deliberately:
-- this suite never reads an answer, and the canonical fixtures only build them
-- where scoring is exercised.
insert into public.assessment_execution_snapshots(
  id,company_id,assessment_cycle_id,source_assessment_template_id,
  template_name,template_type,capture_origin
) values
 ('88000000-0000-4000-8000-000000000451','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000401','88000000-0000-4000-8000-000000000301','Template A','annual','response_generation'),
 ('88000000-0000-4000-8000-000000000452','88000000-0000-4000-8000-000000000102','88000000-0000-4000-8000-000000000402','88000000-0000-4000-8000-000000000302','Template B','annual','response_generation');

-- `assessment_responses_unique_assignment_idx` (0031) is a NON-partial unique
-- index on (cycle, template, employee, evaluator), so every row below is a
-- distinct real assignment. Each ineligible response is disqualified by exactly
-- ONE thing, and that thing is the property it exists to prove:
--   501 eligible        submitted/manager, caller is the evaluator
--   502 status          draft, with its own evaluatee
--   503 perspective     self — 0115's canonical shape is evaluator_id =
--                       employee_id, and the caller IS that evaluator, so
--                       nothing but the perspective can be the reason
--   504 membership      evaluator's company_members row is inactive
--   505 tenant          Tenant B, valid there, foreign from here
insert into public.assessment_responses(id,company_id,assessment_cycle_id,assessment_template_id,assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective) values
 ('88000000-0000-4000-8000-000000000501','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000401','88000000-0000-4000-8000-000000000301','88000000-0000-4000-8000-000000000451','88000000-0000-4000-8000-000000000202','88000000-0000-4000-8000-000000000201','submitted','manager'),
 ('88000000-0000-4000-8000-000000000502','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000401','88000000-0000-4000-8000-000000000301','88000000-0000-4000-8000-000000000451','88000000-0000-4000-8000-000000000203','88000000-0000-4000-8000-000000000201','draft','manager'),
 ('88000000-0000-4000-8000-000000000503','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000401','88000000-0000-4000-8000-000000000301','88000000-0000-4000-8000-000000000451','88000000-0000-4000-8000-000000000201','88000000-0000-4000-8000-000000000201','completed','self'),
 ('88000000-0000-4000-8000-000000000504','88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000401','88000000-0000-4000-8000-000000000301','88000000-0000-4000-8000-000000000451','88000000-0000-4000-8000-000000000202','88000000-0000-4000-8000-000000000206','submitted','manager'),
 ('88000000-0000-4000-8000-000000000505','88000000-0000-4000-8000-000000000102','88000000-0000-4000-8000-000000000402','88000000-0000-4000-8000-000000000302','88000000-0000-4000-8000-000000000452','88000000-0000-4000-8000-000000000208','88000000-0000-4000-8000-000000000207','submitted','manager');

-- ===========================================================================
-- 5. CREATE
--
-- Two roles, two purposes, never mixed (the canonical shape used by
-- assessment_response_execution_mutation_boundaries and friends):
--
--   `set local role authenticated` — what the USER can and cannot do. Every
--   call goes through the boundary, because that is the claim being proved.
--
--   `reset role` — what the DATABASE ended up containing. These are state
--   readbacks, not user behaviour, and they must not run as `authenticated`:
--   the read policy on feedback_threads (0043) evaluates
--   `exists (select 1 from public.people …)` with the INVOKER's privileges, and
--   `authenticated` has no SELECT on people — correctly. A direct table read
--   there fails with `permission denied for table people`, which says nothing
--   about the boundary and everything about the harness asking the wrong role.
--
-- The thread id is generated by the RPC, so it is captured once, privileged,
-- into a transaction-local GUC. `current_setting` needs no table privilege, so
-- the restricted assertions can name the thread without reading it.
-- ===========================================================================
reset role; select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000501','ola')$$,'42501','AUTHENTICATION_REQUIRED','create: unauthenticated denied');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000504','ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','create: inactive membership denied');

select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000501','ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','create: wrong evaluator denied');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000501','ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','create: owner non-participant denied');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000501','ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','create: HR non-participant denied');

-- Non-oracle: a foreign response and one that never existed are the same answer.
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000505','ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','create: foreign response unavailable');
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-0000000009ff','ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','create: nonexistent response identical');
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000502','ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','create: draft response ineligible');
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000503','ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','create: self perspective ineligible');
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000501','   ')$$,'22023','FEEDBACK_CONTENT_INVALID','create: blank content rejected');
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000501',repeat('x',10001))$$,'22023','FEEDBACK_CONTENT_INVALID','create: oversized content rejected');

select is((select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000501','Mensagem inicial')->>'status'),'created','create: eligible evaluator succeeds');
reset role;
select set_config('e5db1.thread_id',(select t.id::text from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),true);
select is((select count(*) from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),1::bigint,'create: exactly one thread');
select is((select t.company_id from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'88000000-0000-4000-8000-000000000101'::uuid,'create: company derived');
select is((select t.sender_employee_id from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'88000000-0000-4000-8000-000000000201'::uuid,'create: sender is the evaluator');
select is((select t.receiver_employee_id from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'88000000-0000-4000-8000-000000000202'::uuid,'create: receiver is the evaluatee');
select is((select t.type from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'feedback','create: type forced');
select is((select t.visibility from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'participants','create: visibility forced');
select is((select t.status from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'awaiting_acknowledgement','create: initial status forced');
select is((select t.title from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'Feedback da avaliação','create: title is the neutral server-derived form (F9)');
select ok((select t.title not like '%Ciclo Confidencial%' from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'create: cycle name never leaks into the title');
select is((select count(*) from public.feedback_messages m join public.feedback_threads t on t.id=m.thread_id where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),1::bigint,'create: exactly one initial message');
select is((select m.content from public.feedback_messages m join public.feedback_threads t on t.id=m.thread_id where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'Mensagem inicial','create: initial message stored');
select is((select m.author_employee_id from public.feedback_messages m join public.feedback_threads t on t.id=m.thread_id where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'88000000-0000-4000-8000-000000000201'::uuid,'create: message authored by sender');

-- Atomic, private audit.
select is((select count(*) from public.activity_events e where e.activity_type='feedback.created' and e.entity_id=current_setting('e5db1.thread_id')::uuid),1::bigint,'create: exactly one audit event');
select is((select e.visibility from public.activity_events e where e.activity_type='feedback.created' and e.entity_id=current_setting('e5db1.thread_id')::uuid),'restricted','create: audit is restricted');
select is((select e.metadata from public.activity_events e where e.activity_type='feedback.created' and e.entity_id=current_setting('e5db1.thread_id')::uuid),'{"operation": "create"}'::jsonb,'create: audit metadata carries only the operation');
select ok((select e.title='Feedback criado' and e.description is null from public.activity_events e where e.activity_type='feedback.created' and e.entity_id=current_setting('e5db1.thread_id')::uuid),'create: audit carries no thread title, message or names');
select is((select count(*) from public.activity_events e where e.activity_type like 'feedback.%' and e.metadata::text like '%Mensagem inicial%'),0::bigint,'create: message content absent from every audit row');

-- Retry by the same still-eligible evaluator.
set local role authenticated;
select is((select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000501','Segunda tentativa')->>'status'),'already_exists','create: retry reports already_exists');
reset role;
select is((select count(*) from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),1::bigint,'create retry: still one thread');
select is((select count(*) from public.feedback_messages m join public.feedback_threads t on t.id=m.thread_id where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),1::bigint,'create retry: no second message');
select is((select count(*) from public.activity_events e where e.activity_type='feedback.created' and e.entity_id=current_setting('e5db1.thread_id')::uuid),1::bigint,'create retry: no second audit');

-- Retry from a caller who is no longer entitled gets the unavailable answer, not the id.
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.create_assessment_feedback_v1('88000000-0000-4000-8000-000000000501','ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','create: unauthorized caller is not told the thread exists');

-- public.feedbacks is untouched by the whole journey.
reset role;
select is((select count(*) from public.feedbacks),0::bigint,'public.feedbacks never written');

-- ===========================================================================
-- 6. REPLY
-- ===========================================================================
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select is((select public.reply_feedback_v1(current_setting('e5db1.thread_id')::uuid,'Resposta do sender')->>'status'),'replied','reply: sender allowed in awaiting');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select public.reply_feedback_v1(current_setting('e5db1.thread_id')::uuid,'Resposta do receiver')->>'status'),'replied','reply: receiver allowed in awaiting');
reset role;
select is((select t.status from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'awaiting_acknowledgement','reply: state unchanged');
select is((select count(*) from public.feedback_messages m join public.feedback_threads t on t.id=m.thread_id where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),3::bigint,'reply: one message per accepted call');
select is((select count(*) from public.activity_events e where e.activity_type='feedback.replied'),2::bigint,'reply: one audit per accepted call');

select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.reply_feedback_v1(current_setting('e5db1.thread_id')::uuid,'ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','reply: non-participant denied');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.reply_feedback_v1(current_setting('e5db1.thread_id')::uuid,'ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','reply: owner non-participant denied');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.reply_feedback_v1(current_setting('e5db1.thread_id')::uuid,'ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','reply: HR non-participant denied');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000007","role":"authenticated"}',true);
select throws_ok($$select public.reply_feedback_v1(current_setting('e5db1.thread_id')::uuid,'ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','reply: cross-tenant denied');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.reply_feedback_v1('88000000-0000-4000-8000-0000000009fe','ola')$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','reply: nonexistent thread identical to foreign');
select throws_ok($$select public.reply_feedback_v1(current_setting('e5db1.thread_id')::uuid,'  ')$$,'22023','FEEDBACK_CONTENT_INVALID','reply: blank content rejected');

-- ===========================================================================
-- 7. ACKNOWLEDGE — receiver only
-- ===========================================================================
select throws_ok($$select public.acknowledge_feedback_v1(current_setting('e5db1.thread_id')::uuid)$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','acknowledge: sender denied');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.acknowledge_feedback_v1(current_setting('e5db1.thread_id')::uuid)$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','acknowledge: non-participant denied');

select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select public.acknowledge_feedback_v1(current_setting('e5db1.thread_id')::uuid)->>'status'),'acknowledged','acknowledge: receiver allowed');
reset role;
select is((select t.status from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'acknowledged','acknowledge: transition applied');
select ok((select t.acknowledged_at is not null from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'acknowledge: timestamp set');
select is((select count(*) from public.feedback_acknowledgements a join public.feedback_threads t on t.id=a.thread_id where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),1::bigint,'acknowledge: exactly one effective acknowledgement');
select is((select count(*) from public.activity_events e where e.activity_type='feedback.acknowledged'),1::bigint,'acknowledge: one audit');
set local role authenticated;
select is((select public.acknowledge_feedback_v1(current_setting('e5db1.thread_id')::uuid)->>'status'),'already_acknowledged','acknowledge retry: already_acknowledged');
reset role;
select is((select count(*) from public.feedback_acknowledgements a join public.feedback_threads t on t.id=a.thread_id where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),1::bigint,'acknowledge retry: no duplicate row');
select is((select count(*) from public.activity_events e where e.activity_type='feedback.acknowledged'),1::bigint,'acknowledge retry: no duplicate audit');

-- Reply is still allowed in acknowledged.
set local role authenticated;
select is((select public.reply_feedback_v1(current_setting('e5db1.thread_id')::uuid,'Resposta pos ack')->>'status'),'replied','reply: allowed in acknowledged');
reset role;
select is((select t.status from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'acknowledged','reply: acknowledged state unchanged');

-- ===========================================================================
-- 8. CLOSE and ARCHIVE
-- ===========================================================================
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.close_feedback_v1(current_setting('e5db1.thread_id')::uuid)$$,'P0002','FEEDBACK_RESOURCE_UNAVAILABLE','close: non-participant denied');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.archive_feedback_v1(current_setting('e5db1.thread_id')::uuid)$$,'55000','FEEDBACK_STATE_TRANSITION_DENIED','archive: denied before close');
select is((select public.close_feedback_v1(current_setting('e5db1.thread_id')::uuid)->>'status'),'closed','close: receiver allowed from acknowledged');
reset role;
select ok((select t.closed_at is not null from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'close: timestamp set');
select is((select count(*) from public.activity_events e where e.activity_type='feedback.closed'),1::bigint,'close: one audit');
set local role authenticated;
select is((select public.close_feedback_v1(current_setting('e5db1.thread_id')::uuid)->>'status'),'already_closed','close retry: already_closed');
reset role;
select is((select count(*) from public.activity_events e where e.activity_type='feedback.closed'),1::bigint,'close retry: no duplicate audit');
set local role authenticated;
select throws_ok($$select public.reply_feedback_v1(current_setting('e5db1.thread_id')::uuid,'ola')$$,'55000','FEEDBACK_STATE_TRANSITION_DENIED','reply: denied in closed');
select throws_ok($$select public.acknowledge_feedback_v1(current_setting('e5db1.thread_id')::uuid)$$,'55000','FEEDBACK_STATE_TRANSITION_DENIED','acknowledge: denied in closed');

select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select public.archive_feedback_v1(current_setting('e5db1.thread_id')::uuid)->>'status'),'archived','archive: sender allowed from closed');
reset role;
select ok((select t.closed_at is not null from public.feedback_threads t where t.assessment_response_id='88000000-0000-4000-8000-000000000501'),'archive: closed timestamp preserved');
select is((select count(*) from public.activity_events e where e.activity_type='feedback.archived'),1::bigint,'archive: one audit');
set local role authenticated;
select is((select public.archive_feedback_v1(current_setting('e5db1.thread_id')::uuid)->>'status'),'already_archived','archive retry: already_archived');
reset role;
select is((select count(*) from public.activity_events e where e.activity_type='feedback.archived'),1::bigint,'archive retry: no duplicate audit');
set local role authenticated;
select throws_ok($$select public.reply_feedback_v1(current_setting('e5db1.thread_id')::uuid,'ola')$$,'55000','FEEDBACK_STATE_TRANSITION_DENIED','archived: reply denied');
-- Acknowledgement is receiver-only, so only the receiver can reach the state
-- machine at all: for the sender the correct answer is the indistinguishable
-- unavailable one, which would prove nothing about `archived`. The actor is
-- switched for this one assertion and restored immediately after.
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.acknowledge_feedback_v1(current_setting('e5db1.thread_id')::uuid)$$,'55000','FEEDBACK_STATE_TRANSITION_DENIED','archived: acknowledge denied');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.close_feedback_v1(current_setting('e5db1.thread_id')::uuid)$$,'55000','FEEDBACK_STATE_TRANSITION_DENIED','archived: close denied');

-- ===========================================================================
-- 9. Audit privacy through the hardened timeline
-- ===========================================================================
reset role;
insert into public.activity_events(id,company_id,activity_type,module,title,visibility,occurred_at) values
 ('88000000-0000-4000-8000-000000000601','88000000-0000-4000-8000-000000000101','company.visible','test','Visivel','company','2026-02-01');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select ok(exists(select 1 from public.get_tenant_activity_timeline_v1('88000000-0000-4000-8000-000000000101',100) where title='Visivel'),'timeline: company activity still visible to a member');
select is((select count(*) from public.get_tenant_activity_timeline_v1('88000000-0000-4000-8000-000000000101',100) where module='feedback'),0::bigint,'timeline: Feedback audit invisible to a non-participant');
select is((select count(*) from public.get_tenant_activity_timeline_v1('88000000-0000-4000-8000-000000000101',100) where visibility<>'company'),0::bigint,'timeline: no restricted row of any kind');
select set_config('request.jwt.claims','{"sub":"88000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.get_tenant_activity_timeline_v1('88000000-0000-4000-8000-000000000101',100) where module='feedback'),0::bigint,'timeline: participants do not get Feedback audit there either');
select ok(not has_table_privilege('authenticated','public.activity_events','select'),'audit: direct table read stays closed');

-- ===========================================================================
-- 10. Physical tenant integrity — proven without the RPCs
-- ===========================================================================
reset role; select set_config('request.jwt.claims','{}',true);
select throws_ok($$insert into public.feedback_threads(company_id,sender_employee_id,receiver_employee_id,created_by_user_id,type,status,priority,visibility,title) values('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000207','88000000-0000-4000-8000-000000000202','88000000-0000-4000-8000-000000000001','feedback','open','normal','participants','x')$$,'23503',null,'thread: cross-tenant sender impossible');
select throws_ok($$insert into public.feedback_threads(company_id,sender_employee_id,receiver_employee_id,created_by_user_id,type,status,priority,visibility,title) values('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000201','88000000-0000-4000-8000-000000000208','88000000-0000-4000-8000-000000000001','feedback','open','normal','participants','x')$$,'23503',null,'thread: cross-tenant receiver impossible');
select throws_ok($$insert into public.feedback_threads(company_id,sender_employee_id,receiver_employee_id,created_by_user_id,assessment_response_id,type,status,priority,visibility,title) values('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000201','88000000-0000-4000-8000-000000000202','88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000505','feedback','open','normal','participants','x')$$,'23503',null,'thread: cross-tenant response impossible');
select throws_ok($$insert into public.feedback_messages(company_id,thread_id,author_employee_id,created_by_user_id,type,content) values('88000000-0000-4000-8000-000000000102',current_setting('e5db1.thread_id')::uuid,'88000000-0000-4000-8000-000000000208','88000000-0000-4000-8000-000000000008','message','x')$$,'23503',null,'message: thread/company mismatch impossible');
select throws_ok($$insert into public.feedback_acknowledgements(company_id,thread_id,employee_id) values('88000000-0000-4000-8000-000000000101',current_setting('e5db1.thread_id')::uuid,'88000000-0000-4000-8000-000000000208')$$,'23503',null,'acknowledgement: cross-tenant employee impossible');
select throws_ok($$insert into public.feedback_threads(company_id,sender_employee_id,receiver_employee_id,created_by_user_id,assessment_response_id,type,status,priority,visibility,title) values('88000000-0000-4000-8000-000000000101','88000000-0000-4000-8000-000000000201','88000000-0000-4000-8000-000000000202','88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000501','feedback','open','normal','participants','x')$$,'23505',null,'origin uniqueness is enforced by the index, not by a check');

select * from finish(); rollback;
