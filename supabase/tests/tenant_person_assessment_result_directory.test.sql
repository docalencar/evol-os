begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

select has_function('public', 'compute_assessment_scored_result_v1', array['uuid', 'uuid']);
select has_function('public', 'get_tenant_person_assessment_result_directory_v1', array['uuid', 'uuid']);
select is(
  (select prosecdef from pg_proc where oid = 'public.get_tenant_person_assessment_result_directory_v1(uuid,uuid)'::regprocedure),
  true,
  'Person directory is SECURITY DEFINER'
);
select is(
  (select proconfig from pg_proc where oid = 'public.get_tenant_person_assessment_result_directory_v1(uuid,uuid)'::regprocedure),
  array['search_path=public, pg_temp'],
  'Person directory search_path is hardened'
);
select function_privs_are(
  'public', 'get_tenant_person_assessment_result_directory_v1', array['uuid', 'uuid'],
  'authenticated', array['EXECUTE'], 'authenticated alone can execute Person directory'
);
select function_privs_are(
  'public', 'get_tenant_person_assessment_result_directory_v1', array['uuid', 'uuid'],
  'anon', array[]::text[], 'anon cannot execute Person directory'
);
select function_privs_are(
  'public', 'get_tenant_person_assessment_result_directory_v1', array['uuid', 'uuid'],
  'public', array[]::text[], 'PUBLIC cannot execute Person directory'
);
select function_privs_are(
  'public', 'get_tenant_person_assessment_result_directory_v1', array['uuid', 'uuid'],
  'service_role', array[]::text[], 'service_role is not an application path'
);
select function_privs_are(
  'public', 'compute_assessment_scored_result_v1', array['uuid', 'uuid'],
  'authenticated', array[]::text[], 'authenticated cannot execute private scorer'
);
select function_privs_are(
  'public', 'compute_assessment_scored_result_v1', array['uuid', 'uuid'],
  'anon', array[]::text[], 'anon cannot execute private scorer'
);
select function_privs_are(
  'public', 'compute_assessment_scored_result_v1', array['uuid', 'uuid'],
  'public', array[]::text[], 'PUBLIC cannot execute private scorer'
);
select function_privs_are(
  'public', 'compute_assessment_scored_result_v1', array['uuid', 'uuid'],
  'service_role', array[]::text[], 'service_role cannot execute private scorer'
);
select is(
  (select proargnames from pg_proc where oid = 'public.get_tenant_person_assessment_result_directory_v1(uuid,uuid)'::regprocedure),
  array[
    'p_company_id', 'p_person_id', 'cycle_id', 'cycle_name', 'model_name',
    'cycle_date', 'response_id', 'perspective', 'response_status',
    'submitted_at', 'completed_at', 'overall_score'
  ]::text[],
  'Person directory exposes the exact minimized contract'
);

insert into auth.users(id, email) values
  ('c2000000-0000-4000-8000-000000000001', 'owner-b2b2a@example.com'),
  ('c2000000-0000-4000-8000-000000000002', 'admin-b2b2a@example.com'),
  ('c2000000-0000-4000-8000-000000000003', 'hr-b2b2a@example.com'),
  ('c2000000-0000-4000-8000-000000000004', 'manager-b2b2a@example.com'),
  ('c2000000-0000-4000-8000-000000000005', 'employee-b2b2a@example.com'),
  ('c2000000-0000-4000-8000-000000000006', 'foreign-owner-b2b2a@example.com'),
  ('c2000000-0000-4000-8000-000000000007', 'inactive-b2b2a@example.com'),
  ('c2000000-0000-4000-8000-000000000008', 'no-membership-b2b2a@example.com'),
  ('c2000000-0000-4000-8000-000000000009', 'foreign-admin-b2b2a@example.com'),
  ('c2000000-0000-4000-8000-000000000010', 'foreign-hr-b2b2a@example.com');

insert into public.companies(id, name, slug) values
  ('c2000000-0000-4000-8000-000000000101', 'Person Results Alpha', 'person-results-alpha'),
  ('c2000000-0000-4000-8000-000000000102', 'Person Results Beta', 'person-results-beta');

insert into public.company_members(id, company_id, user_id, role, status) values
  (gen_random_uuid(), 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000001', 'owner', 'active'),
  (gen_random_uuid(), 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000002', 'admin', 'active'),
  (gen_random_uuid(), 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000003', 'hr', 'active'),
  (gen_random_uuid(), 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000004', 'manager', 'active'),
  (gen_random_uuid(), 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000005', 'employee', 'active'),
  (gen_random_uuid(), 'c2000000-0000-4000-8000-000000000102', 'c2000000-0000-4000-8000-000000000006', 'owner', 'active'),
  (gen_random_uuid(), 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000007', 'admin', 'inactive'),
  (gen_random_uuid(), 'c2000000-0000-4000-8000-000000000102', 'c2000000-0000-4000-8000-000000000009', 'admin', 'active'),
  (gen_random_uuid(), 'c2000000-0000-4000-8000-000000000102', 'c2000000-0000-4000-8000-000000000010', 'hr', 'active');

insert into public.people(id, company_id, user_id, full_name, email, status) values
  ('c2000000-0000-4000-8000-000000000201', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000001', 'Owner', 'owner-b2b2a@example.com', 'active'),
  ('c2000000-0000-4000-8000-000000000202', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000002', 'Admin', 'admin-b2b2a@example.com', 'active'),
  ('c2000000-0000-4000-8000-000000000203', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000003', 'HR', 'hr-b2b2a@example.com', 'active'),
  ('c2000000-0000-4000-8000-000000000204', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000004', 'Manager', 'manager-b2b2a@example.com', 'active'),
  ('c2000000-0000-4000-8000-000000000205', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000005', 'Target Person', 'employee-b2b2a@example.com', 'active'),
  ('c2000000-0000-4000-8000-000000000206', 'c2000000-0000-4000-8000-000000000102', 'c2000000-0000-4000-8000-000000000006', 'Foreign Owner', 'foreign-owner-b2b2a@example.com', 'active'),
  ('c2000000-0000-4000-8000-000000000207', 'c2000000-0000-4000-8000-000000000101', null, 'Second Manager', 'second-manager-b2b2a@example.com', 'active'),
  ('c2000000-0000-4000-8000-000000000208', 'c2000000-0000-4000-8000-000000000102', null, 'Foreign Target', 'foreign-target-b2b2a@example.com', 'active'),
  -- Distinct evaluators for the non-official Responses below. The unique index
  -- assessment_responses_unique_assignment_idx (0031) covers
  -- (assessment_cycle_id, assessment_template_id, employee_id, evaluator_id),
  -- so the in-progress and cancelled fixtures need evaluators of their own.
  ('c2000000-0000-4000-8000-000000000211', 'c2000000-0000-4000-8000-000000000101', null, 'Third Manager', 'third-manager-b2b2a@example.com', 'active'),
  ('c2000000-0000-4000-8000-000000000212', 'c2000000-0000-4000-8000-000000000101', null, 'Fourth Manager', 'fourth-manager-b2b2a@example.com', 'active');

insert into public.assessment_templates(id, company_id, name, type, status, active) values
  ('c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000101', 'Mutable live model', 'annual', 'active', true);
insert into public.assessment_sections(id, company_id, assessment_template_id, name, weight, display_order, active) values
  ('c2000000-0000-4000-8000-000000000311', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000301', 'Numeric', 1, 1, true),
  ('c2000000-0000-4000-8000-000000000312', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000301', 'Qualitative', 1, 2, true);
insert into public.assessment_questions(id, template_id, company_id, assessment_section_id, question, question_type, scale_min, scale_max, weight, display_order, required, active) values
  ('c2000000-0000-4000-8000-000000000321', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000311', 'Score 0-10', 'scale', 0, 10, 1, 1, true, true),
  ('c2000000-0000-4000-8000-000000000322', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000312', 'Evidence', 'text', 1, 5, 1, 1, true, true);

insert into public.assessment_cycles(id, company_id, name, assessment_type, status, start_date, end_date, assessment_template_id, assessment_visibility) values
  ('c2000000-0000-4000-8000-000000000401', 'c2000000-0000-4000-8000-000000000101', 'Administrative hidden Cycle', 'performance', 'active', '2026-08-01', '2026-08-31', 'c2000000-0000-4000-8000-000000000301', 'none'),
  ('c2000000-0000-4000-8000-000000000402', 'c2000000-0000-4000-8000-000000000101', 'Qualitative Cycle', 'performance', 'active', '2026-07-01', '2026-07-31', 'c2000000-0000-4000-8000-000000000301', 'full');

insert into public.assessment_execution_snapshots(id, company_id, assessment_cycle_id, source_assessment_template_id, template_name, template_type, capture_origin) values
  ('c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000401', 'c2000000-0000-4000-8000-000000000301', 'Frozen numeric model', 'annual', 'response_generation'),
  ('c2000000-0000-4000-8000-000000000412', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000402', 'c2000000-0000-4000-8000-000000000301', 'Frozen qualitative model', 'annual', 'response_generation');
insert into public.assessment_execution_snapshot_sections(id, company_id, assessment_execution_snapshot_id, source_assessment_section_id, name, weight, display_order, active_at_capture) values
  ('c2000000-0000-4000-8000-000000000421', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000311', 'Numeric', 1, 1, true),
  ('c2000000-0000-4000-8000-000000000422', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000412', 'c2000000-0000-4000-8000-000000000312', 'Qualitative', 1, 1, true);
insert into public.assessment_execution_snapshot_questions(id, company_id, assessment_execution_snapshot_id, assessment_execution_snapshot_section_id, source_assessment_question_id, question, question_type, required, weight, display_order, scale_min, scale_max, active_at_capture) values
  ('c2000000-0000-4000-8000-000000000431', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000421', 'c2000000-0000-4000-8000-000000000321', 'Frozen score 0-10', 'scale', true, 1, 1, 0, 10, true),
  ('c2000000-0000-4000-8000-000000000432', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000412', 'c2000000-0000-4000-8000-000000000422', 'c2000000-0000-4000-8000-000000000322', 'Frozen evidence', 'text', true, 1, 1, 1, 5, true);

insert into public.assessment_responses(id, company_id, assessment_cycle_id, assessment_template_id, assessment_execution_snapshot_id, employee_id, evaluator_id, status, perspective, submitted_at, completed_at) values
  ('c2000000-0000-4000-8000-000000000501', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000401', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000205', 'c2000000-0000-4000-8000-000000000205', 'submitted', 'self', '2026-08-20', null),
  ('c2000000-0000-4000-8000-000000000502', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000401', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000205', 'c2000000-0000-4000-8000-000000000204', 'completed', 'manager', null, '2026-08-21'),
  ('c2000000-0000-4000-8000-000000000503', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000401', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000205', 'c2000000-0000-4000-8000-000000000207', 'submitted', 'manager', '2026-08-22', null),
  ('c2000000-0000-4000-8000-000000000504', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000401', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000205', 'c2000000-0000-4000-8000-000000000201', 'submitted', 'direct_report', '2026-08-23', null),
  ('c2000000-0000-4000-8000-000000000505', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000401', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000205', 'c2000000-0000-4000-8000-000000000202', 'completed', 'legacy_unknown', null, '2026-08-24'),
  ('c2000000-0000-4000-8000-000000000506', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000402', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000412', 'c2000000-0000-4000-8000-000000000205', 'c2000000-0000-4000-8000-000000000203', 'submitted', 'manager', '2026-07-20', null),
  ('c2000000-0000-4000-8000-000000000507', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000401', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000205', 'c2000000-0000-4000-8000-000000000203', 'draft', 'self', null, null);

insert into public.assessment_responses(id, company_id, assessment_cycle_id, assessment_template_id, assessment_execution_snapshot_id, employee_id, evaluator_id, status, perspective) values
  ('c2000000-0000-4000-8000-000000000509', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000401', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000205', 'c2000000-0000-4000-8000-000000000211', 'in_progress', 'self'),
  ('c2000000-0000-4000-8000-000000000510', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000401', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000205', 'c2000000-0000-4000-8000-000000000212', 'cancelled', 'self');

insert into public.assessment_answers(id, company_id, assessment_response_id, assessment_question_id, assessment_execution_snapshot_id, assessment_execution_snapshot_question_id, score, answer_text) values
  ('c2000000-0000-4000-8000-000000000601', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000501', 'c2000000-0000-4000-8000-000000000321', 'c2000000-0000-4000-8000-000000000411', 'c2000000-0000-4000-8000-000000000431', 8, null),
  ('c2000000-0000-4000-8000-000000000602', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000506', 'c2000000-0000-4000-8000-000000000322', 'c2000000-0000-4000-8000-000000000412', 'c2000000-0000-4000-8000-000000000432', null, 'Private qualitative evidence');

-- ---------------------------------------------------------------------------
-- Additional fixtures.
--
--   Person ...209  target for the 2-5 normalization regression.
--   Person ...210  evaluatee for the valid-visibility compatibility matrix.
--
-- No fixture is built for the invalid assessment_visibility = NULL state,
-- because since 0114 that state is unreachable by construction. See the
-- unreachability assertions near the end of this file.
--
-- None of these rows touch Person ...205's directory result set, so every
-- assertion above keeps its original expected values.
-- ---------------------------------------------------------------------------

insert into auth.users(id, email) values
  ('c2000000-0000-4000-8000-000000000011', 'visibility-evaluatee-b2b2a@example.com');

insert into public.company_members(id, company_id, user_id, role, status) values
  (gen_random_uuid(), 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000011', 'employee', 'active');

insert into public.people(id, company_id, user_id, full_name, email, status) values
  ('c2000000-0000-4000-8000-000000000209', 'c2000000-0000-4000-8000-000000000101', null, 'Scale Target', 'scale-target-b2b2a@example.com', 'active'),
  ('c2000000-0000-4000-8000-000000000210', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000011', 'Visibility Evaluatee', 'visibility-evaluatee-b2b2a@example.com', 'active');

insert into public.assessment_templates(id, company_id, name, type, status, active) values
  ('c2000000-0000-4000-8000-000000000302', 'c2000000-0000-4000-8000-000000000102', 'Foreign live model', 'annual', 'active', true);

insert into public.assessment_cycles(id, company_id, name, assessment_type, status, start_date, end_date, assessment_template_id, assessment_visibility) values
  ('c2000000-0000-4000-8000-000000000403', 'c2000000-0000-4000-8000-000000000101', 'Two to five Cycle', 'performance', 'active', '2026-06-01', '2026-06-30', 'c2000000-0000-4000-8000-000000000301', 'full'),
  ('c2000000-0000-4000-8000-000000000404', 'c2000000-0000-4000-8000-000000000102', 'Foreign tenant Cycle', 'performance', 'active', '2026-06-01', '2026-06-30', 'c2000000-0000-4000-8000-000000000302', 'full'),
  ('c2000000-0000-4000-8000-000000000405', 'c2000000-0000-4000-8000-000000000101', 'Score only Cycle', 'performance', 'active', '2026-05-01', '2026-05-31', 'c2000000-0000-4000-8000-000000000301', 'score'),
  ('c2000000-0000-4000-8000-000000000406', 'c2000000-0000-4000-8000-000000000101', 'Score and competencies Cycle', 'performance', 'active', '2026-05-01', '2026-05-31', 'c2000000-0000-4000-8000-000000000301', 'score_and_competencies'),
  ('c2000000-0000-4000-8000-000000000407', 'c2000000-0000-4000-8000-000000000101', 'Score and comments Cycle', 'performance', 'active', '2026-05-01', '2026-05-31', 'c2000000-0000-4000-8000-000000000301', 'score_and_comments'),
  ('c2000000-0000-4000-8000-000000000408', 'c2000000-0000-4000-8000-000000000101', 'Full visibility Cycle', 'performance', 'active', '2026-05-01', '2026-05-31', 'c2000000-0000-4000-8000-000000000301', 'full');

insert into public.assessment_execution_snapshots(id, company_id, assessment_cycle_id, source_assessment_template_id, template_name, template_type, capture_origin) values
  ('c2000000-0000-4000-8000-000000000413', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000403', 'c2000000-0000-4000-8000-000000000301', 'Frozen two-to-five model', 'annual', 'response_generation'),
  ('c2000000-0000-4000-8000-000000000415', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000405', 'c2000000-0000-4000-8000-000000000301', 'Frozen score model', 'annual', 'response_generation'),
  ('c2000000-0000-4000-8000-000000000416', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000406', 'c2000000-0000-4000-8000-000000000301', 'Frozen competencies model', 'annual', 'response_generation'),
  ('c2000000-0000-4000-8000-000000000417', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000407', 'c2000000-0000-4000-8000-000000000301', 'Frozen comments model', 'annual', 'response_generation'),
  ('c2000000-0000-4000-8000-000000000418', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000408', 'c2000000-0000-4000-8000-000000000301', 'Frozen full model', 'annual', 'response_generation');

insert into public.assessment_execution_snapshot_sections(id, company_id, assessment_execution_snapshot_id, source_assessment_section_id, name, weight, display_order, active_at_capture) values
  ('c2000000-0000-4000-8000-000000000423', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000413', 'c2000000-0000-4000-8000-000000000311', 'Two to five', 1, 1, true),
  ('c2000000-0000-4000-8000-000000000425', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000415', 'c2000000-0000-4000-8000-000000000311', 'Numeric', 1, 1, true),
  ('c2000000-0000-4000-8000-000000000426', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000416', 'c2000000-0000-4000-8000-000000000311', 'Numeric', 1, 1, true),
  ('c2000000-0000-4000-8000-000000000427', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000417', 'c2000000-0000-4000-8000-000000000311', 'Numeric', 1, 1, true),
  ('c2000000-0000-4000-8000-000000000428', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000418', 'c2000000-0000-4000-8000-000000000311', 'Numeric', 1, 1, true);

insert into public.assessment_execution_snapshot_questions(id, company_id, assessment_execution_snapshot_id, assessment_execution_snapshot_section_id, source_assessment_question_id, question, question_type, required, weight, display_order, scale_min, scale_max, active_at_capture) values
  ('c2000000-0000-4000-8000-000000000433', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000413', 'c2000000-0000-4000-8000-000000000423', 'c2000000-0000-4000-8000-000000000321', 'Frozen score 2-5', 'scale', true, 1, 1, 2, 5, true),
  ('c2000000-0000-4000-8000-000000000435', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000415', 'c2000000-0000-4000-8000-000000000425', 'c2000000-0000-4000-8000-000000000321', 'Frozen score 0-10', 'scale', true, 1, 1, 0, 10, true),
  ('c2000000-0000-4000-8000-000000000436', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000416', 'c2000000-0000-4000-8000-000000000426', 'c2000000-0000-4000-8000-000000000321', 'Frozen score 0-10', 'scale', true, 1, 1, 0, 10, true),
  ('c2000000-0000-4000-8000-000000000437', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000417', 'c2000000-0000-4000-8000-000000000427', 'c2000000-0000-4000-8000-000000000321', 'Frozen score 0-10', 'scale', true, 1, 1, 0, 10, true),
  ('c2000000-0000-4000-8000-000000000438', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000418', 'c2000000-0000-4000-8000-000000000428', 'c2000000-0000-4000-8000-000000000321', 'Frozen score 0-10', 'scale', true, 1, 1, 0, 10, true);

insert into public.assessment_responses(id, company_id, assessment_cycle_id, assessment_template_id, assessment_execution_snapshot_id, employee_id, evaluator_id, status, perspective, submitted_at) values
  ('c2000000-0000-4000-8000-000000000512', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000403', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000413', 'c2000000-0000-4000-8000-000000000209', 'c2000000-0000-4000-8000-000000000203', 'submitted', 'self', '2026-06-20'),
  ('c2000000-0000-4000-8000-000000000515', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000405', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000415', 'c2000000-0000-4000-8000-000000000210', 'c2000000-0000-4000-8000-000000000204', 'submitted', 'manager', '2026-05-20'),
  ('c2000000-0000-4000-8000-000000000516', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000406', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000416', 'c2000000-0000-4000-8000-000000000210', 'c2000000-0000-4000-8000-000000000204', 'submitted', 'manager', '2026-05-21'),
  ('c2000000-0000-4000-8000-000000000517', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000407', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000417', 'c2000000-0000-4000-8000-000000000210', 'c2000000-0000-4000-8000-000000000204', 'submitted', 'manager', '2026-05-22'),
  ('c2000000-0000-4000-8000-000000000518', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000408', 'c2000000-0000-4000-8000-000000000301', 'c2000000-0000-4000-8000-000000000418', 'c2000000-0000-4000-8000-000000000210', 'c2000000-0000-4000-8000-000000000204', 'submitted', 'manager', '2026-05-23');

insert into public.assessment_answers(id, company_id, assessment_response_id, assessment_question_id, assessment_execution_snapshot_id, assessment_execution_snapshot_question_id, score, answer_text) values
  ('c2000000-0000-4000-8000-000000000603', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000512', 'c2000000-0000-4000-8000-000000000321', 'c2000000-0000-4000-8000-000000000413', 'c2000000-0000-4000-8000-000000000433', 4, null),
  -- assessment_answers_single_payload_check (0113) allows exactly one of
  -- answer_text / answer_number / answer_boolean / score, so these carry the
  -- score only.
  ('c2000000-0000-4000-8000-000000000605', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000515', 'c2000000-0000-4000-8000-000000000321', 'c2000000-0000-4000-8000-000000000415', 'c2000000-0000-4000-8000-000000000435', 8, null),
  ('c2000000-0000-4000-8000-000000000606', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000516', 'c2000000-0000-4000-8000-000000000321', 'c2000000-0000-4000-8000-000000000416', 'c2000000-0000-4000-8000-000000000436', 8, null),
  ('c2000000-0000-4000-8000-000000000607', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000517', 'c2000000-0000-4000-8000-000000000321', 'c2000000-0000-4000-8000-000000000417', 'c2000000-0000-4000-8000-000000000437', 8, null),
  ('c2000000-0000-4000-8000-000000000608', 'c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000518', 'c2000000-0000-4000-8000-000000000321', 'c2000000-0000-4000-8000-000000000418', 'c2000000-0000-4000-8000-000000000438', 8, null);

update public.assessment_templates
set name = 'Changed after capture'
where id = 'c2000000-0000-4000-8000-000000000301';

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  '42501',
  'permission denied for function get_tenant_person_assessment_result_directory_v1',
  'anonymous is denied by ACL'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  'same-tenant owner is allowed'
);
select is(
  (select count(*) from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')),
  5::bigint,
  'official self, two Manager, legacy and qualitative Results remain independent'
);
select is(
  (select overall_score from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205') where response_id = 'c2000000-0000-4000-8000-000000000501'),
  80::numeric,
  '0-10 raw score 8 is normalized to 80 by shared scoring authority'
);
select is(
  (select overall_score from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205') where response_id = 'c2000000-0000-4000-8000-000000000506'),
  null::numeric,
  'qualitative official Result preserves NULL score'
);
select is(
  (select model_name from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205') where response_id = 'c2000000-0000-4000-8000-000000000501'),
  'Frozen numeric model',
  'historical Model name comes from snapshot after live authoring changes'
);
select is(
  (select count(*) from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205') where perspective = 'manager'),
  3::bigint,
  'multiple Manager Results are returned independently without aggregation'
);
select is(
  (select count(*) from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205') where perspective = 'direct_report'),
  0::bigint,
  'direct-report is completely omitted'
);
select is(
  (select count(*) from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205') where response_status not in ('submitted', 'completed')),
  0::bigint,
  'draft, in-progress and cancelled states are omitted'
);
select is(
  (select count(*) from public.get_current_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101')),
  0::bigint,
  '0117 evaluatee directory still omits visibility none'
);

reset role;
select is(
  (
    select count(*)
    from public.activity_events event
    where event.company_id = 'c2000000-0000-4000-8000-000000000101'
      and event.entity_type = 'person'
      and event.entity_id = 'c2000000-0000-4000-8000-000000000205'
      and event.metadata ->> 'operation' = 'read_person_result_directory'
  ),
  8::bigint,
  'each successful directory invocation emits one Activity regardless of returned row count'
);
select ok(
  not exists (
    select 1
    from public.activity_events event
    where event.entity_type = 'person'
      and event.entity_id = 'c2000000-0000-4000-8000-000000000205'
      and lower(event.metadata::text) ~ 'answer|question|comment|evaluator|evidence'
  ),
  'directory audit metadata contains no private Result payload'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  'same-tenant admin is allowed'
);
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  'same-tenant HR is allowed'
);

select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  '42501', 'ASSESSMENT_PERSON_RESULT_DIRECTORY_FORBIDDEN', 'same-tenant manager denied'
);
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  '42501', 'ASSESSMENT_PERSON_RESULT_DIRECTORY_FORBIDDEN', 'same-tenant employee denied'
);
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  '42501', 'ASSESSMENT_PERSON_RESULT_DIRECTORY_FORBIDDEN', 'cross-tenant owner denied'
);
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000009","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  '42501', 'ASSESSMENT_PERSON_RESULT_DIRECTORY_FORBIDDEN', 'cross-tenant admin denied'
);
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000010","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  '42501', 'ASSESSMENT_PERSON_RESULT_DIRECTORY_FORBIDDEN', 'cross-tenant HR denied'
);
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  '42501', 'ASSESSMENT_PERSON_RESULT_DIRECTORY_FORBIDDEN', 'inactive membership denied'
);
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000008","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  '42501', 'ASSESSMENT_PERSON_RESULT_DIRECTORY_FORBIDDEN', 'no membership denied'
);

select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000208')$$,
  '42501', 'ASSESSMENT_PERSON_RESULT_DIRECTORY_FORBIDDEN', 'foreign Person is denied without metadata leak'
);
select throws_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000999')$$,
  '42501', 'ASSESSMENT_PERSON_RESULT_DIRECTORY_FORBIDDEN', 'nonexistent Person has the same safe denial'
);

select lives_ok(
  $$select public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000501')$$,
  'existing scorer remains available to same-tenant owner'
);
select is(
  (public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000501') ->> 'formulaVersion'),
  'response-scale-weighted-v1',
  'existing scorer formulaVersion is unchanged'
);
select ok(
  position('evaluator' in lower(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000501')::text)) = 0,
  'existing scorer still exposes no evaluator identity'
);

select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
-- Response ...502 and not ...501: ...501 is a self-assessment, where the
-- evaluatee is also the evaluator and therefore legitimately gets full access
-- regardless of visibility. ...502 is the Manager Result of the same Person in
-- the same visibility=none Cycle, which is the case this assertion is about.
select throws_ok(
  $$select public.read_assessment_result_for_evaluatee('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000502')$$,
  '42501', 'ASSESSMENT_RESULT_NOT_VISIBLE', 'evaluatee wrapper still respects visibility none'
);

reset role;
select is(
  (
    select count(*)
    from public.activity_events event
    where event.company_id = 'c2000000-0000-4000-8000-000000000101'
      and event.entity_type = 'person'
      and event.entity_id = 'c2000000-0000-4000-8000-000000000205'
      and event.metadata ->> 'operation' = 'read_person_result_directory'
  ),
  10::bigint,
  'denied calls create no successful directory Activity'
);

-- ---------------------------------------------------------------------------
-- Normalized score regression (canonical formula vs. score / scale_max * 100).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  (select round(overall_score, 6) from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000209') where response_id = 'c2000000-0000-4000-8000-000000000512'),
  66.666667::numeric,
  '2-5 raw score 4 normalizes to 66.666667 through the shared scoring authority'
);
select isnt(
  (select round(overall_score, 6) from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000209') where response_id = 'c2000000-0000-4000-8000-000000000512'),
  80.000000::numeric,
  'normalization subtracts scale_min: an incorrect score/scale_max*100 would yield 80'
);

-- ---------------------------------------------------------------------------
-- Invalid assessment_visibility = NULL: hardening plus proof of unreachability.
--
-- The 0118 hardening fails closed on this state. It cannot be exercised with a
-- fixture, and deliberately so: since 0114 the state is unreachable by
-- construction. assessment_visibility is NOT NULL with a CHECK for the five
-- valid modes, and the composite foreign keys pin every Response to a snapshot
-- and every snapshot to a Cycle of the same company, so the scorer's Cycle
-- lookup can never miss. Building a fixture would require dropping a
-- production constraint, which is not an acceptable way to prove a guard.
--
-- What is asserted instead: the constraints that make the state unreachable,
-- and the presence of the guard in both scorer paths so the hardening cannot
-- be silently removed later.
-- ---------------------------------------------------------------------------
reset role;
select ok(
  exists (select 1 from pg_constraint where conname = 'assessment_responses_snapshot_cycle_company_fkey'),
  'Responses are pinned to snapshot, Cycle and company by one composite foreign key');
select ok(
  exists (select 1 from pg_constraint where conname = 'assessment_execution_snapshots_cycle_company_fkey'),
  'snapshots are pinned to a Cycle of the same company by composite foreign key');
select col_not_null(
  'public', 'assessment_cycles', 'assessment_visibility',
  'assessment_visibility is NOT NULL, so a coherent Cycle always yields a mode');
select matches(
  (select prosrc from pg_proc where oid = 'public.get_tenant_assessment_scored_result_v1(uuid,uuid)'::regprocedure),
  'v_visibility is null',
  'public scorer keeps the fail-closed guard for the invalid NULL visibility state');
select matches(
  (select prosrc from pg_proc where oid = 'public.compute_assessment_scored_result_v1(uuid,uuid)'::regprocedure),
  'v_visibility is null',
  'private helper keeps the same fail-closed guard');

-- ---------------------------------------------------------------------------
-- Valid visibility compatibility: the NULL hardening must not alter any of the
-- five legitimate modes. Read as the evaluatee, who is neither evaluator nor
-- owner/admin/hr, so the minimization branches are the ones under test.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000011","role":"authenticated"}', true);

select is(
  (public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000515') ->> 'overallScore')::numeric,
  80::numeric, 'visibility score still returns the normalized overall score');
select is(
  jsonb_array_length(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000515') -> 'sections'),
  0, 'visibility score still hides sections');
select is(
  jsonb_array_length(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000515') -> 'questions'),
  0, 'visibility score still hides questions');
select is(
  jsonb_array_length(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000515') -> 'answers'),
  0, 'visibility score still hides answers');

select cmp_ok(
  jsonb_array_length(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000516') -> 'sections'),
  '>', 0, 'visibility score_and_competencies still exposes sections');
select is(
  jsonb_array_length(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000516') -> 'questions'),
  0, 'visibility score_and_competencies still hides questions');
select is(
  jsonb_array_length(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000516') -> 'answers'),
  0, 'visibility score_and_competencies still hides answers');

select is(
  jsonb_array_length(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000517') -> 'sections'),
  0, 'visibility score_and_comments still hides sections');
select cmp_ok(
  jsonb_array_length(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000517') -> 'answers'),
  '>', 0, 'visibility score_and_comments still exposes comment answers');
select ok(
  not exists (
    select 1
    from jsonb_array_elements(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000517') -> 'answers') answer
    where answer -> 'answerNumber' <> 'null'::jsonb
       or answer -> 'answerBoolean' <> 'null'::jsonb
  ),
  'visibility score_and_comments still nulls answerNumber and answerBoolean');

select cmp_ok(
  jsonb_array_length(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000518') -> 'sections'),
  '>', 0, 'visibility full still exposes sections');
select cmp_ok(
  jsonb_array_length(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000518') -> 'questions'),
  '>', 0, 'visibility full still exposes questions');
select cmp_ok(
  jsonb_array_length(public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000518') -> 'answers'),
  '>', 0, 'visibility full still exposes answers');

-- ---------------------------------------------------------------------------
-- AUTH_REQUIRED. The anon assertion near the top proves privilege closure but
-- stops at the ACL; this exercises the internal guard from a context that is
-- allowed to invoke the function yet carries no `sub` claim, so auth.uid() is
-- NULL. Pattern taken from tenant_employee_competencies_profile_read_boundary
-- and position_seniority_profiles_foundation. No grant is broadened.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_tenant_person_assessment_result_directory_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000205')$$,
  '28000', 'AUTH_REQUIRED',
  'a null auth context is denied by the explicit internal AUTH_REQUIRED guard'
);
select throws_ok(
  $$select public.get_tenant_assessment_scored_result_v1('c2000000-0000-4000-8000-000000000101', 'c2000000-0000-4000-8000-000000000501')$$,
  '28000', 'AUTH_REQUIRED',
  'the public scorer keeps its own null auth context guard'
);
reset role;
select matches(
  (select prosrc from pg_proc where oid = 'public.get_tenant_person_assessment_result_directory_v1(uuid,uuid)'::regprocedure),
  'auth\.uid\(\) is null',
  'Person directory carries an explicit auth.uid() guard in its definition'
);

select * from finish();
rollback;
