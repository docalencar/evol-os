create unique index if not exists
assessment_responses_unique_assignment_idx
on public.assessment_responses(
  assessment_cycle_id,
  assessment_template_id,
  employee_id,
  evaluator_id
);

notify pgrst, 'reload schema';
