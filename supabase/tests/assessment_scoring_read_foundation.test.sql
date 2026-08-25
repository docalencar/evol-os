begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select plan(25);

select has_column('public','assessment_responses','perspective','Response stores immutable perspective');
select col_not_null('public','assessment_responses','perspective','perspective is required');
select is(
  (select pg_get_constraintdef(oid) from pg_constraint
   where conrelid='public.assessment_responses'::regclass
     and conname='assessment_responses_perspective_check'),
  'CHECK ((perspective = ANY (ARRAY[''self''::text, ''manager''::text, ''direct_report''::text, ''legacy_unknown''::text])))',
  'perspective allows exactly the approved execution and historical values');
select has_function('public','get_tenant_assessment_scored_result_v1',array['uuid','uuid'],'scored read RPC exists');
select function_privs_are('public','get_tenant_assessment_scored_result_v1',array['uuid','uuid'],'authenticated',array['EXECUTE'],'authenticated alone can execute scored read');
select function_privs_are('public','get_tenant_assessment_scored_result_v1',array['uuid','uuid'],'anon',array[]::text[],'anon cannot execute scored read');
select function_privs_are('public','get_tenant_assessment_scored_result_v1',array['uuid','uuid'],'public',array[]::text[],'public cannot execute scored read');
select is((select prosecdef from pg_proc where oid='public.get_tenant_assessment_scored_result_v1(uuid,uuid)'::regprocedure),true,'scored read is SECURITY DEFINER');
select is((select proconfig from pg_proc where oid='public.get_tenant_assessment_scored_result_v1(uuid,uuid)'::regprocedure),array['search_path=public, pg_temp'],'scored read search_path is hardened');
select is(round(((8-0)::numeric/(10-0))*100,6),80.000000::numeric,'0-10 answer 8 normalizes to 80');
select is(round(((4-2)::numeric/(5-2))*100,6),66.666667::numeric,'2-5 answer 4 normalizes deterministically');
select is(round(((0-0)::numeric/(10-0))*100,6),0.000000::numeric,'minimum normalizes to zero');
select is(round(((10-0)::numeric/(10-0))*100,6),100.000000::numeric,'maximum normalizes to 100');
select is((select count(*)::int from information_schema.tables where table_schema='public' and table_name like '%assessment%score%'),0,'no score materialization table exists');
-- ---------------------------------------------------------------------------
-- Scoring authority (updated for 0118).
--
-- 0118 extracted the canonical score projection from the public scorer into the
-- private helper compute_assessment_scored_result_v1, leaving the public scorer
-- as the authorized and audited wrapper. The assertions below previously read
-- literal source snippets out of the public scorer -- including its aliases and
-- its exact spacing -- so the approved extraction broke them even though the
-- observable behaviour never changed.
--
-- They now assert the same guarantees against the function that actually owns
-- each one, matched by tolerant patterns rather than by incidental formatting.
-- ---------------------------------------------------------------------------

-- The public scorer must remain a wrapper over the shared implementation.
select ok(
  (select prosrc from pg_proc where oid='public.get_tenant_assessment_scored_result_v1(uuid,uuid)'::regprocedure)
    ~ 'compute_assessment_scored_result_v1',
  'public scorer delegates projection to the shared private scorer');

-- Single scoring authority: exactly one function in public may implement the
-- normalization formula. A second implementation anywhere fails this.
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prosrc ~ 'scale_max\s*-\s*[a-z_.]*scale_min'),
  1,
  'exactly one function implements the snapshot normalization formula');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prosrc ~ 'response-scale-weighted-v1'),
  1,
  'exactly one function emits formulaVersion response-scale-weighted-v1');

-- Only scale Questions are quantified: yes_no, number and text must never be.
select ok(
  (select prosrc from pg_proc where oid='public.compute_assessment_scored_result_v1(uuid,uuid)'::regprocedure)
    ~ 'question_type\s*=\s*''scale''',
  'only snapshot scale Questions are quantified');

-- Canonical formula, in two halves. Together these reject an implementation
-- that ignores scale_min, such as score / scale_max * 100.
select ok(
  (select prosrc from pg_proc where oid='public.compute_assessment_scored_result_v1(uuid,uuid)'::regprocedure)
    ~ '\(\s*[a-z_.]*score\s*-\s*[a-z_.]*scale_min\s*\)',
  'normalization subtracts the snapshot scale_min from the raw score');
select ok(
  (select prosrc from pg_proc where oid='public.compute_assessment_scored_result_v1(uuid,uuid)'::regprocedure)
    ~ '\(\s*[a-z_.]*scale_max\s*-\s*[a-z_.]*scale_min\s*\)',
  'normalization divides by the snapshot scale range, not by scale_max');

-- No raw averaging may replace the weighted projection.
select ok(
  (select prosrc from pg_proc where oid='public.compute_assessment_scored_result_v1(uuid,uuid)'::regprocedure)
    !~* '\mavg\s*\(',
  'no raw averaging implementation was introduced');

-- Snapshot authority.
select ok(
  (select prosrc from pg_proc where oid='public.compute_assessment_scored_result_v1(uuid,uuid)'::regprocedure)
    ~ 'assessment_execution_snapshot_questions',
  'scoring reads snapshot Questions');
select ok(
  (select prosrc from pg_proc where oid='public.compute_assessment_scored_result_v1(uuid,uuid)'::regprocedure)
      !~ 'public\.assessment_questions'
  and (select prosrc from pg_proc where oid='public.compute_assessment_scored_result_v1(uuid,uuid)'::regprocedure)
      !~ 'public\.assessment_sections'
  and (select prosrc from pg_proc where oid='public.get_tenant_assessment_scored_result_v1(uuid,uuid)'::regprocedure)
      !~ 'public\.assessment_questions',
  'scoring has no live authoring fallback for Questions or Sections');

-- Official status eligibility stays on the public boundary.
select ok(
  (select prosrc from pg_proc where oid='public.get_tenant_assessment_scored_result_v1(uuid,uuid)'::regprocedure)
    ~ 'status\s+in\s*\(\s*''submitted''\s*,\s*''completed''\s*\)',
  'official read admits eligible statuses only');
select ok(position('new.perspective<>old.perspective' in pg_get_functiondef('public.protect_assessment_response_immutability()'::regprocedure))>0,'perspective is protected by Response immutability');

select * from finish();
rollback;
