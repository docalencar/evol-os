begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select no_plan();

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'admin@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'hr@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'manager@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'evaluator@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'evaluatee@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'unrelated@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'other-owner@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'other-admin@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'other-member@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'no-membership@test.local', '', now(), now(), now());

insert into public.companies (id, name, slug)
values
  ('20000000-0000-4000-8000-000000000001', 'Assessment Test', 'assessment-test'),
  ('20000000-0000-4000-8000-000000000002', 'Other Tenant', 'assessment-other');

insert into public.company_members (company_id, user_id, role)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'admin'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'hr'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'manager'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'employee'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', 'employee'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007', 'employee'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000008', 'owner'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000009', 'admin'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000010', 'employee');

insert into public.people (id, company_id, user_id, full_name)
values
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Owner'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Admin'),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'HR'),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000008', 'Other Owner'),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000009', 'Other Admin'),
  ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000010', 'Other Member'),
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'Evaluator'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', 'Evaluatee'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'Manager'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007', 'Unrelated');

insert into public.assessment_templates (id, company_id, name, type, status)
values (
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Template',
  '360',
  'active'
);

insert into public.assessment_cycles (
  id, company_id, name, assessment_template_id, start_date, end_date,
  assessment_visibility
) values (
  '50000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Cycle',
  '40000000-0000-4000-8000-000000000001',
  current_date,
  current_date + 1,
  'full'
);

insert into public.assessment_sections (
  id, company_id, assessment_template_id, name
) values (
  '60000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'Leadership'
);

insert into public.assessment_questions (
  id, template_id, company_id, assessment_section_id, question
) values (
  '70000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  'Communicates clearly?'
);

insert into public.assessment_execution_snapshots (
  id, company_id, assessment_cycle_id, source_assessment_template_id,
  template_name, template_type, capture_origin
) values (
  '45000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'Template', '360', 'legacy_backfill_current_state'
);
insert into public.assessment_execution_snapshot_sections (
  id, company_id, assessment_execution_snapshot_id, source_assessment_section_id,
  name, weight, display_order, active_at_capture
) values (
  '65000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '45000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  'Leadership', 1, 0, true
);
insert into public.assessment_execution_snapshot_questions (
  id, company_id, assessment_execution_snapshot_id,
  assessment_execution_snapshot_section_id, source_assessment_question_id,
  question, question_type, required, weight, display_order, scale_min, scale_max,
  active_at_capture
) values (
  '75000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '45000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'Communicates clearly?', 'scale', true, 1, 0, 1, 5, true
);

insert into public.assessment_responses (
  id, company_id, assessment_cycle_id, assessment_template_id,
  assessment_execution_snapshot_id, employee_id, evaluator_id, status, perspective
) values (
  '80000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '45000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000001',
  'in_progress', 'legacy_unknown'
);

insert into public.assessment_answers (
  id, company_id, assessment_response_id, assessment_question_id,
  assessment_execution_snapshot_id, assessment_execution_snapshot_question_id, score
) values (
  '90000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '45000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001',
  4
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}', true);

select results_eq(
  $$ select count(*) from public.assessment_responses $$,
  array[1::bigint],
  'evaluator reads own response'
);
select results_eq(
  $$ select count(*) from public.assessment_answers $$,
  array[1::bigint],
  'evaluator reads own answer'
);
select lives_ok(
  $$ select public.save_tenant_assessment_answer_v1(
       '20000000-0000-4000-8000-000000000001',
       '80000000-0000-4000-8000-000000000001',
       '70000000-0000-4000-8000-000000000001',null,null,null,5
     ) $$,
  'evaluator updates open answer through trusted boundary'
);
select lives_ok(
  $$ select public.submit_tenant_assessment_response_v1(
       '20000000-0000-4000-8000-000000000001',
       '80000000-0000-4000-8000-000000000001'
     ) $$,
  'evaluator submits response through trusted boundary'
);
select throws_ok(
  $$ update public.assessment_answers set score = 3 where id = '90000000-0000-4000-8000-000000000001' $$,
  '42501','permission denied for table assessment_answers',
  'direct submitted Answer mutation is privilege-dead'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select results_eq(
  $$ select count(*) from public.assessment_responses $$,
  array[0::bigint],
  'evaluatee has no direct raw response access'
);
select ok(
  (public.read_assessment_result_for_evaluatee(
    '20000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000001'
  ) ->> 'visibility') = 'full',
  'evaluatee receives configured read model'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select results_eq(
  $$ select count(*) from public.assessment_responses $$,
  array[0::bigint],
  'manager without evaluator participation has no access'
);
select throws_ok(
  $$ insert into public.assessment_responses (
       id, company_id, assessment_cycle_id, assessment_template_id,
       employee_id, evaluator_id, status
     ) values (
       '80000000-0000-4000-8000-000000000002',
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-000000000001',
       '40000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000004',
       '30000000-0000-4000-8000-000000000003',
       'draft'
     ) $$,
  '42501',
  'permission denied for table assessment_responses',
  'manager cannot create assignments directly'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
select results_eq(
  $$ select count(*) from public.assessment_answers $$,
  array[0::bigint],
  'unrelated member has no access'
);
select throws_ok(
  $$ insert into public.assessment_answers (company_id, assessment_response_id, assessment_question_id, score)
     values ('20000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 1)
     on conflict (assessment_response_id, assessment_question_id) do nothing $$,
  '42501',
  'permission denied for table assessment_answers',
  'unrelated member cannot insert Answer directly'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select results_eq($$ select count(*) from public.assessment_answers $$, array[0::bigint], 'owner has no direct raw access');
select throws_ok(
  $$ insert into public.assessment_responses (
       id, company_id, assessment_cycle_id, assessment_template_id,
       employee_id, evaluator_id, status
     ) values (
       '80000000-0000-4000-8000-000000000002',
       '20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-000000000001',
       '40000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000004',
       '30000000-0000-4000-8000-000000000003',
       'draft'
     ) $$,
  '42501',
  'permission denied for table assessment_responses',
  'owner cannot create assignments outside the trusted cycle boundary'
);
select ok(
  jsonb_array_length(public.read_assessment_administratively(
    '20000000-0000-4000-8000-000000000001', 'response',
    '80000000-0000-4000-8000-000000000001', 'review_response'
  ) -> 'answers') = 1,
  'owner reads through administrative RPC'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select results_eq($$ select count(*) from public.assessment_responses $$, array[0::bigint], 'admin has no direct raw access');
select throws_ok(
  $$ update public.assessment_responses
     set updated_at = now()
     where id = '80000000-0000-4000-8000-000000000001' $$,
  '42501','permission denied for table assessment_responses',
  'admin cannot alter Responses directly'
);
select lives_ok(
  $$ select public.read_assessment_administratively('20000000-0000-4000-8000-000000000001', 'response', '80000000-0000-4000-8000-000000000001', 'review_response') $$,
  'admin reads through administrative RPC'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select results_eq($$ select count(*) from public.assessment_answers $$, array[0::bigint], 'hr has no direct raw access');
select lives_ok(
  $$ select public.read_assessment_administratively('20000000-0000-4000-8000-000000000001', 'response', '80000000-0000-4000-8000-000000000001', 'review_response') $$,
  'hr reads through administrative RPC'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select lives_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'designated evaluator reads scored result');
select ok(position('evaluator' in lower(public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')::text))=0,'scored payload does not disclose evaluator identity');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select lives_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'evaluatee reads scored result according to visibility');
select lives_ok($$select public.read_assessment_result_for_evaluatee('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'evaluatee wrapper delegates safely');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'same-tenant owner reads scored result');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'same-tenant admin reads scored result');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'same-tenant hr reads scored result');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
select throws_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'42501','ASSESSMENT_RESULT_FORBIDDEN','unrelated same-tenant Person is denied');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000008","role":"authenticated"}', true);
select is(public.current_person_id('20000000-0000-4000-8000-000000000001'),null::uuid,'cross-tenant owner reproduces original NULL actor condition');
select throws_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'42501','ASSESSMENT_RESULT_FORBIDDEN','Tenant B owner cannot read Tenant A scored result');
select throws_ok($$select public.read_assessment_result_for_evaluatee('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'42501','ASSESSMENT_RESULT_NOT_VISIBLE','evaluatee wrapper denies cross-tenant owner');
select throws_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000001')$$,'P0002','ASSESSMENT_RESULT_NOT_AVAILABLE','wrong company and valid Response pairing is safely unavailable');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000009","role":"authenticated"}', true);
select throws_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'42501','ASSESSMENT_RESULT_FORBIDDEN','Tenant B admin cannot read Tenant A scored result');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000010","role":"authenticated"}', true);
select throws_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'42501','ASSESSMENT_RESULT_FORBIDDEN','Tenant B ordinary member cannot read Tenant A scored result');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000011","role":"authenticated"}', true);
select throws_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'42501','ASSESSMENT_RESULT_FORBIDDEN','authenticated user without requested-tenant membership is denied');

reset role;
update public.assessment_cycles set assessment_visibility='score' where id='50000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select ok(jsonb_array_length(public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')->'sections')=0,'score visibility returns no dimensions');
reset role;
update public.assessment_cycles set assessment_visibility='score_and_competencies' where id='50000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select ok(jsonb_array_length(public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')->'sections')=1,'score-and-competencies visibility returns allowed dimensions');
reset role;
update public.assessment_cycles set assessment_visibility='score_and_comments' where id='50000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select ok(jsonb_array_length(public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')->'answers')=1,'score-and-comments visibility returns allowed evidence');
reset role;
update public.assessment_cycles set assessment_visibility='none' where id='50000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select throws_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'42501','ASSESSMENT_RESULT_NOT_VISIBLE','none visibility remains denied to evaluatee');
reset role;
update public.assessment_cycles set assessment_visibility='full' where id='50000000-0000-4000-8000-000000000001';
set local role anon;
select throws_ok($$select public.get_tenant_assessment_scored_result_v1('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001')$$,'42501','permission denied for function get_tenant_assessment_scored_result_v1','anonymous cannot execute scored-result boundary');

reset role;
select results_eq(
  $$
    select count(*)
    from public.activity_events
    where activity_type = 'assessments.administrative_read'
      and company_id = '20000000-0000-4000-8000-000000000001'::uuid
  $$,
  array[6::bigint],
  'every administrative read created an audit event'
);
select results_eq(
  $$
    select count(*)
    from public.activity_events
    where company_id = '20000000-0000-4000-8000-000000000001'::uuid
      and metadata::text like '%Sensitive comment%'
  $$,
  array[0::bigint],
  'audit metadata excludes sensitive content'
);

select * from finish();
rollback;
