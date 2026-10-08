begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ADR-0012 classifies assessment_answers as a Tenant-Owned Child. Refuse every
-- historical state that would require choosing or inventing ownership. Data
-- repair is deliberately not part of this migration.
do $$
declare
  v_null_company bigint;
  v_orphaned_origin bigint;
  v_ambiguous_origin bigint;
  v_tenant_divergence bigint;
  v_match_simple_bypass bigint;
begin
  select count(*) into v_null_company
  from public.assessment_answers answer
  where answer.company_id is null;

  select count(*) into v_orphaned_origin
  from public.assessment_answers answer
  left join public.assessments legacy_assessment
    on legacy_assessment.id = answer.assessment_id
  left join public.assessment_responses response
    on response.id = answer.assessment_response_id
  left join public.assessment_questions legacy_question
    on legacy_question.id = answer.question_id
  left join public.assessment_questions question
    on question.id = answer.assessment_question_id
  left join public.assessment_execution_snapshots snapshot
    on snapshot.id = answer.assessment_execution_snapshot_id
  left join public.assessment_execution_snapshot_questions snapshot_question
    on snapshot_question.id = answer.assessment_execution_snapshot_question_id
  where (answer.assessment_id is null and answer.assessment_response_id is null)
    or (answer.assessment_id is not null and legacy_assessment.id is null)
    or (answer.assessment_response_id is not null and response.id is null)
    or (answer.question_id is not null and legacy_question.id is null)
    or (answer.assessment_question_id is not null and question.id is null)
    or (answer.assessment_execution_snapshot_id is not null and snapshot.id is null)
    or (answer.assessment_execution_snapshot_question_id is not null
      and snapshot_question.id is null);

  select count(*) into v_ambiguous_origin
  from public.assessment_answers answer
  join public.assessments legacy_assessment
    on legacy_assessment.id = answer.assessment_id
  join public.assessment_responses response
    on response.id = answer.assessment_response_id
  where legacy_assessment.company_id is distinct from response.company_id;

  select count(*) into v_tenant_divergence
  from public.assessment_answers answer
  left join public.assessments legacy_assessment
    on legacy_assessment.id = answer.assessment_id
  left join public.assessment_responses response
    on response.id = answer.assessment_response_id
  left join public.assessment_questions legacy_question
    on legacy_question.id = answer.question_id
  left join public.assessment_questions question
    on question.id = answer.assessment_question_id
  left join public.assessment_execution_snapshots snapshot
    on snapshot.id = answer.assessment_execution_snapshot_id
  left join public.assessment_execution_snapshot_questions snapshot_question
    on snapshot_question.id = answer.assessment_execution_snapshot_question_id
  where answer.company_id is not null
    and (legacy_assessment.company_id is distinct from answer.company_id
      and legacy_assessment.id is not null
      or response.company_id is distinct from answer.company_id
      and response.id is not null
      or legacy_question.company_id is distinct from answer.company_id
      and legacy_question.id is not null
      or question.company_id is distinct from answer.company_id
      and question.id is not null
      or snapshot.company_id is distinct from answer.company_id
      and snapshot.id is not null
      or snapshot_question.company_id is distinct from answer.company_id
      and snapshot_question.id is not null);

  select count(*) into v_match_simple_bypass
  from public.assessment_answers answer
  where answer.company_id is null
    and num_nonnulls(
      answer.assessment_id,
      answer.assessment_response_id,
      answer.question_id,
      answer.assessment_question_id,
      answer.assessment_execution_snapshot_id,
      answer.assessment_execution_snapshot_question_id
    ) > 0;

  if v_null_company <> 0
    or v_orphaned_origin <> 0
    or v_ambiguous_origin <> 0
    or v_tenant_divergence <> 0
    or v_match_simple_bypass <> 0
  then
    raise exception using
      errcode = '23514',
      message = 'ASSESSMENT_ANSWERS_COMPANY_ID_PREFLIGHT_FAILED',
      detail = format(
        'null_company=%s orphaned_origin=%s ambiguous_origin=%s tenant_divergence=%s match_simple_bypass=%s',
        v_null_company,
        v_orphaned_origin,
        v_ambiguous_origin,
        v_tenant_divergence,
        v_match_simple_bypass
      );
  end if;
end;
$$;

alter table public.assessment_answers
  add constraint assessment_answers_company_id_not_null_check
  check (company_id is not null) not valid;

alter table public.assessment_answers
  validate constraint assessment_answers_company_id_not_null_check;

alter table public.assessment_answers
  alter column company_id set not null;

alter table public.assessment_answers
  drop constraint assessment_answers_company_id_not_null_check;

commit;
