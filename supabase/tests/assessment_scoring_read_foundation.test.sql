begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select plan(19);

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
select ok(position('q.question_type=''scale''' in pg_get_functiondef('public.get_tenant_assessment_scored_result_v1(uuid,uuid)'::regprocedure))>0,'only snapshot scale Questions are quantified');
select ok(position('r.status in (''submitted'',''completed'')' in pg_get_functiondef('public.get_tenant_assessment_scored_result_v1(uuid,uuid)'::regprocedure))>0,'official read admits eligible statuses only');
select ok(position('assessment_execution_snapshot_questions' in pg_get_functiondef('public.get_tenant_assessment_scored_result_v1(uuid,uuid)'::regprocedure))>0,'scoring reads snapshot Questions');
select ok(position('public.assessment_questions' in pg_get_functiondef('public.get_tenant_assessment_scored_result_v1(uuid,uuid)'::regprocedure))=0,'scoring has no live Question fallback');
select ok(position('new.perspective<>old.perspective' in pg_get_functiondef('public.protect_assessment_response_immutability()'::regprocedure))>0,'perspective is protected by Response immutability');

select * from finish();
rollback;
