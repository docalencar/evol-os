begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select plan(12);
select is((select perspective from public.assessment_responses where id='b5000000-0000-4000-8000-000000000801'),'self','submitted SELF backfills to self');
select is((select perspective from public.assessment_responses where id='b5000000-0000-4000-8000-000000000802'),'legacy_unknown','submitted non-self backfills conservatively');
select is((select perspective from public.assessment_responses where id='b5000000-0000-4000-8000-000000000803'),'self','completed SELF backfills to self');
select results_eq($$select id,status,submitted_at,completed_at,employee_id,evaluator_id from public.assessment_responses where id::text like 'b5000000-0000-4000-8000-00000000080_' order by id$$,$$values
 ('b5000000-0000-4000-8000-000000000801'::uuid,'submitted','2026-01-10'::timestamptz,null::timestamptz,'b5000000-0000-4000-8000-000000000201'::uuid,'b5000000-0000-4000-8000-000000000201'::uuid),
 ('b5000000-0000-4000-8000-000000000802'::uuid,'submitted','2026-01-11'::timestamptz,null::timestamptz,'b5000000-0000-4000-8000-000000000202'::uuid,'b5000000-0000-4000-8000-000000000201'::uuid),
 ('b5000000-0000-4000-8000-000000000803'::uuid,'completed','2026-01-12'::timestamptz,'2026-01-13'::timestamptz,'b5000000-0000-4000-8000-000000000202'::uuid,'b5000000-0000-4000-8000-000000000202'::uuid)$$,'state, timestamps and assignment identities remain unchanged');
select is((select count(*)::int from public.assessment_answers where id::text like 'b5000000-0000-4000-8000-00000000090_'),3,'Answers remain unchanged');
select is((select count(*)::int from public.assessment_execution_snapshots where id='b5000000-0000-4000-8000-000000000701'),1,'snapshot remains unchanged');
select is((select count(*)::int from public.activity_events where company_id='b5000000-0000-4000-8000-000000000101'),0,'backfill emits no Activity');
select throws_ok($$update public.assessment_responses set perspective='manager' where id='b5000000-0000-4000-8000-000000000801'$$,'55000','ASSESSMENT_RESPONSE_IMMUTABLE','submitted perspective remains immutable');
select throws_ok($$update public.assessment_responses set perspective='manager' where id='b5000000-0000-4000-8000-000000000803'$$,'55000','ASSESSMENT_RESPONSE_IMMUTABLE','completed perspective remains immutable');
select throws_ok($$update public.assessment_responses set employee_id='b5000000-0000-4000-8000-000000000201' where id='b5000000-0000-4000-8000-000000000802'$$,'55000','ASSESSMENT_RESPONSE_IMMUTABLE','terminal assignment remains immutable');
select is((select count(*)::int from public.assessment_responses where id::text like 'b5000000-0000-4000-8000-00000000080_'),3,'row count remains unchanged');
select is((select count(*)::int from public.assessment_responses where id::text like 'b5000000-0000-4000-8000-00000000080_' and perspective in ('manager','direct_report')),0,'historical rows never infer manager/direct_report');
select * from finish();
rollback;
