begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(21);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'admin@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'hr@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'manager@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'evaluator@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'evaluatee@test.local', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'unrelated@test.local', '', now(), now(), now());

insert into public.companies (id, name, slug)
values ('20000000-0000-4000-8000-000000000001', 'Assessment Test', 'assessment-test');

insert into public.company_members (company_id, user_id, role)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'admin'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'hr'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'manager'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'employee'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', 'employee'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007', 'employee');

insert into public.people (id, company_id, user_id, full_name)
values
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

insert into public.assessment_responses (
  id, company_id, assessment_cycle_id, assessment_template_id,
  employee_id, evaluator_id, status
) values (
  '80000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000001',
  'in_progress'
);

insert into public.assessment_answers (
  id, company_id, assessment_response_id, assessment_question_id,
  answer_text, score
) values (
  '90000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'Sensitive comment',
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
  $$ update public.assessment_answers set answer_text = 'Updated' where id = '90000000-0000-4000-8000-000000000001' $$,
  'evaluator updates open answer'
);
select lives_ok(
  $$ update public.assessment_responses set status = 'submitted' where id = '80000000-0000-4000-8000-000000000001' $$,
  'evaluator submits response'
);
select results_eq(
  $$ update public.assessment_answers set answer_text = 'Forbidden' where id = '90000000-0000-4000-8000-000000000001' returning 1 $$,
  $$ values (null::integer) limit 0 $$,
  'submitted answer cannot be updated'
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
  'new row violates row-level security policy for table "assessment_responses"',
  'manager cannot create assignments'
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
  'new row violates row-level security policy for table "assessment_answers"',
  'unrelated member cannot insert answer'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select results_eq($$ select count(*) from public.assessment_answers $$, array[0::bigint], 'owner has no direct raw access');
select lives_ok(
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
  'owner creates assessment assignment'
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
select results_eq(
  $$ update public.assessment_responses
     set updated_at = now()
     where id = '80000000-0000-4000-8000-000000000001'
     returning 1 $$,
  $$ values (null::integer) limit 0 $$,
  'admin cannot alter responses'
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
select results_eq(
  $$ select count(*) from public.activity_events where activity_type = 'assessments.administrative_read' $$,
  array[3::bigint],
  'every administrative read created an audit event'
);
select results_eq(
  $$ select count(*) from public.activity_events where metadata::text like '%Sensitive comment%' $$,
  array[0::bigint],
  'audit metadata excludes sensitive content'
);

select * from finish();
rollback;
