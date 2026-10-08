begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

select col_not_null(
  'public',
  'assessment_answers',
  'company_id',
  'assessment_answers ownership is mandatory'
);

select is(
  (
    select count(*)
    from pg_constraint
    where conrelid = 'public.assessment_answers'::regclass
      and conname = 'assessment_answers_company_id_not_null_check'
  ),
  0::bigint,
  'the rollout-only check is removed after SET NOT NULL'
);

select throws_ok(
  $$insert into public.assessment_answers default values$$,
  '23502',
  'null value in column "company_id" of relation "assessment_answers" violates not-null constraint',
  'a row cannot use NULL company_id to bypass MATCH SIMPLE foreign keys'
);

select is(
  (
    select string_agg(
      conname::text || ':' || confupdtype::text || ':' || confdeltype::text,
      E'\n' order by conname
    )
    from pg_constraint
    where conrelid = 'public.assessment_answers'::regclass
      and contype = 'f'
  ),
  E'assessment_answers_assessment_id_fkey:a:c\n'
    || E'assessment_answers_assessment_response_id_fkey:a:c\n'
    || E'assessment_answers_company_id_fkey:a:c\n'
    || E'assessment_answers_question_company_fkey:a:r\n'
    || E'assessment_answers_question_id_fkey:a:c\n'
    || E'assessment_answers_question_snapshot_company_fkey:a:r\n'
    || E'assessment_answers_response_snapshot_company_fkey:a:c',
  'all foreign-key names and ON UPDATE/ON DELETE actions remain unchanged'
);

select ok(
  has_table_privilege('authenticated', 'public.assessment_answers', 'select')
  and not has_table_privilege('authenticated', 'public.assessment_answers', 'insert')
  and not has_table_privilege('authenticated', 'public.assessment_answers', 'update')
  and not has_table_privilege('authenticated', 'public.assessment_answers', 'delete'),
  'RLS-facing table privileges remain read-only for authenticated clients'
);

select has_function(
  'public',
  'save_tenant_assessment_answer_v1',
  array['uuid', 'uuid', 'uuid', 'text', 'numeric', 'boolean', 'integer'],
  'the trusted answer mutation boundary remains present'
);

select * from finish();
rollback;
