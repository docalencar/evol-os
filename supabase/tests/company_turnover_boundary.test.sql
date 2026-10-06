begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

select has_table('company_turnover_monthly_facts');
select has_function('public', 'get_company_turnover_v1', array['uuid','text']);
select ok((select prosecdef and proconfig = array['search_path=public, pg_temp']
  from pg_proc where oid='public.get_company_turnover_v1(uuid,text)'::regprocedure),
  'Turnover RPC is SECURITY DEFINER with fixed search_path');
select ok(has_function_privilege('authenticated','public.get_company_turnover_v1(uuid,text)','execute'),
  'authenticated may execute the trusted RPC');
select ok((select bool_and(not has_function_privilege(role_name,
  'public.get_company_turnover_v1(uuid,text)','execute'))
  from unnest(array['public','anon','service_role']) role_name),
  'PUBLIC, anon and service_role cannot execute the RPC');
select ok((select bool_and(not has_table_privilege(role_name,
  'public.company_turnover_monthly_facts', privilege_name))
  from unnest(array['public','anon','authenticated','service_role']) role_name,
       unnest(array['select','insert','update','delete']) privilege_name),
  'no client role has direct accumulator DML');
select ok((select relrowsecurity from pg_class where oid='public.company_turnover_monthly_facts'::regclass),
  'accumulator RLS is enabled');
select ok((select not has_table_privilege('authenticated','public.people','select')
  and not has_table_privilege('authenticated','public.people','update')),
  'People direct ACL remains closed');
select is((select count(*) from pg_trigger where tgrelid='public.people'::regclass
  and tgname='capture_company_turnover_people_delta_v1' and not tgisinternal), 1::bigint,
  'exactly one Turnover People trigger exists');
select ok(pg_get_functiondef('public.ensure_company_turnover_period_v1(uuid,timestamptz)'::regprocedure)
  like '%pg_advisory_xact_lock%', 'period mutation serializes per company');

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
 ('21000000-0000-4000-8000-000000000001','authenticated','authenticated','tdb2-owner@test.local','',now(),now(),now()),
 ('21000000-0000-4000-8000-000000000002','authenticated','authenticated','tdb2-admin@test.local','',now(),now(),now()),
 ('21000000-0000-4000-8000-000000000003','authenticated','authenticated','tdb2-hr@test.local','',now(),now(),now()),
 ('21000000-0000-4000-8000-000000000004','authenticated','authenticated','tdb2-manager@test.local','',now(),now(),now()),
 ('21000000-0000-4000-8000-000000000005','authenticated','authenticated','tdb2-employee@test.local','',now(),now(),now()),
 ('21000000-0000-4000-8000-000000000006','authenticated','authenticated','tdb2-foreign@test.local','',now(),now(),now());
insert into public.companies(id,name,slug) values
 ('22000000-0000-4000-8000-000000000001','T-DB2 Alpha','t-db2-alpha'),
 ('22000000-0000-4000-8000-000000000002','T-DB2 Beta','t-db2-beta');
insert into public.company_members(company_id,user_id,role) values
 ('22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','owner'),
 ('22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002','admin'),
 ('22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000003','hr'),
 ('22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000004','manager'),
 ('22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000005','employee'),
 ('22000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000006','owner');

insert into public.people(id,company_id,user_id,full_name,status) values
 ('23000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','Owner','active'),
 ('23000000-0000-4000-8000-000000000002','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002','Admin','active'),
 ('23000000-0000-4000-8000-000000000003','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000003','HR','on_leave'),
 ('23000000-0000-4000-8000-000000000004','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000004','Manager','inactive'),
 ('23000000-0000-4000-8000-000000000005','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000005','Employee','active'),
 ('23000000-0000-4000-8000-000000000006','22000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000006','Foreign','active'),
 ('23000000-0000-4000-8000-000000000007','22000000-0000-4000-8000-000000000001',null,'Initially terminated','terminated');

select is((select headcount_current from public.company_turnover_monthly_facts
  where company_id='22000000-0000-4000-8000-000000000001'
  and period_start=date_trunc('month',now() at time zone 'UTC')::date), 4,
  'active and on_leave count; inactive and initially terminated do not');
select is((select canonical_terminations from public.company_turnover_monthly_facts
  where company_id='22000000-0000-4000-8000-000000000001'
  and period_start=date_trunc('month',now() at time zone 'UTC')::date), 0,
  'creating an already terminated person does not count as a termination');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"21000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_company_turnover_v1(
  '22000000-0000-4000-8000-000000000001','executive_turnover')),2::bigint,
  'authorized read always returns previous closed plus current MTD rows');
select results_eq($$select period_kind,availability,headcount_at_start,headcount_as_of,turnover_percent
  from public.get_company_turnover_v1('22000000-0000-4000-8000-000000000001','executive_turnover')
  order by period_start$$,
  $$values ('closed'::text,'unavailable'::text,null::integer,null::integer,null::numeric),
           ('mtd'::text,'unavailable'::text,null::integer,null::integer,null::numeric)$$,
  'partial coverage fails closed for both periods');

select set_config('request.jwt.claims','{"sub":"21000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select * from public.get_company_turnover_v1(
  '22000000-0000-4000-8000-000000000001','executive_turnover')$$,
  'ADMINISTRATIVE_READ_FORBIDDEN','manager is denied');
select set_config('request.jwt.claims','{"sub":"21000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select * from public.get_company_turnover_v1(
  '22000000-0000-4000-8000-000000000001','executive_turnover')$$,
  'ADMINISTRATIVE_READ_FORBIDDEN','employee is denied');
select set_config('request.jwt.claims','{"sub":"21000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select * from public.get_company_turnover_v1(
  '22000000-0000-4000-8000-000000000001','executive_turnover')$$,
  'ADMINISTRATIVE_READ_FORBIDDEN','foreign owner is denied non-oracularly');

reset role;
update public.company_turnover_monthly_facts set
  coverage_started_at=period_start::timestamp at time zone 'UTC',
  headcount_at_start=4
where company_id='22000000-0000-4000-8000-000000000001'
  and period_start=date_trunc('month',now() at time zone 'UTC')::date;

update public.people set status='terminated'
where id='23000000-0000-4000-8000-000000000003';
select results_eq($$select headcount_current,canonical_terminations
  from public.company_turnover_monthly_facts
  where company_id='22000000-0000-4000-8000-000000000001'
    and period_start=date_trunc('month',now() at time zone 'UTC')::date$$,
  $$select 3::integer,1::integer$$,'on_leave to terminated decreases headcount and increments numerator');

update public.people set full_name='Employee renamed'
where id='23000000-0000-4000-8000-000000000005';
select results_eq($$select headcount_current,canonical_terminations
  from public.company_turnover_monthly_facts
  where company_id='22000000-0000-4000-8000-000000000001'
    and period_start=date_trunc('month',now() at time zone 'UTC')::date$$,
  $$select 3::integer,1::integer$$,'non-status update is idempotent for Turnover facts');

update public.people set status='active'
where id='23000000-0000-4000-8000-000000000004';
select is((select headcount_current from public.company_turnover_monthly_facts
  where company_id='22000000-0000-4000-8000-000000000001'
  and period_start=date_trunc('month',now() at time zone 'UTC')::date),4,
  'inactive to active enters headcount without a termination');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"21000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select results_eq($$select availability,headcount_at_start,headcount_as_of,
  canonical_terminations,round(turnover_percent,2),headcount_at_end is null,
  headcount_as_of_at is not null,period_end_exclusive > current_date
  from public.get_company_turnover_v1('22000000-0000-4000-8000-000000000001','executive_turnover')
  where period_kind='mtd'$$,
  $$select 'available'::text,4::integer,4::integer,1::integer,
    25.00::numeric,true::boolean,true::boolean,true::boolean$$,
  'admin reads factual MTD with civil end distinct from factual as-of');
select set_config('request.jwt.claims','{"sub":"21000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select availability from public.get_company_turnover_v1(
  '22000000-0000-4000-8000-000000000001','executive_turnover') where period_kind='mtd'),
  'available','hr is authorized');

reset role;
do $$
begin
  update public.people set status='terminated'
  where id='23000000-0000-4000-8000-000000000005';
  raise exception 'forced rollback';
exception when others then
  null;
end $$;
select results_eq($$select p.status,f.headcount_current,f.canonical_terminations
  from public.people p cross join public.company_turnover_monthly_facts f
  where p.id='23000000-0000-4000-8000-000000000005'
    and f.company_id=p.company_id
    and f.period_start=date_trunc('month',now() at time zone 'UTC')::date$$,
  $$select 'active'::text,4::integer,1::integer$$,'People and Turnover accumulator roll back atomically');

-- Simulate a fully covered previous row, then exercise the real rollover helper.
update public.company_turnover_monthly_facts set
  period_start=(date_trunc('month',now() at time zone 'UTC')-interval '1 month')::date,
  period_end_exclusive=date_trunc('month',now() at time zone 'UTC')::date,
  coverage_started_at=(date_trunc('month',now() at time zone 'UTC')-interval '1 month') at time zone 'UTC',
  headcount_at_start=5, headcount_current=4, headcount_at_end=null, closed_at=null
where company_id='22000000-0000-4000-8000-000000000001'
  and period_start=date_trunc('month',now() at time zone 'UTC')::date;
select public.ensure_company_turnover_period_v1(
  '22000000-0000-4000-8000-000000000001',transaction_timestamp());
select is((select count(*) from public.company_turnover_monthly_facts
  where company_id='22000000-0000-4000-8000-000000000001'),2::bigint,
  'rollover creates exactly the next monthly row');
select results_eq($$select headcount_at_end,closed_at is not null
  from public.company_turnover_monthly_facts
  where company_id='22000000-0000-4000-8000-000000000001'
    and period_start=(date_trunc('month',now() at time zone 'UTC')-interval '1 month')::date$$,
  $$select 4::integer,true::boolean$$,'rollover closes the previous month at its factual ending headcount');
select results_eq($$select headcount_at_start,headcount_current,canonical_terminations
  from public.company_turnover_monthly_facts
  where company_id='22000000-0000-4000-8000-000000000001'
    and period_start=date_trunc('month',now() at time zone 'UTC')::date$$,
  $$select 4::integer,4::integer,0::integer$$,'rollover opens current MTD from the prior ending headcount');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"21000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select results_eq($$select period_kind,availability,headcount_at_start,headcount_at_end,
  headcount_as_of,canonical_terminations,round(turnover_percent,2)
  from public.get_company_turnover_v1('22000000-0000-4000-8000-000000000001','executive_turnover')
  order by period_start$$,
  $$select * from (values
      ('closed'::text,'available'::text,5::integer,4::integer,null::integer,1::integer,22.22::numeric),
      ('mtd'::text,'available'::text,4::integer,null::integer,4::integer,0::integer,0.00::numeric)
    ) expected(period_kind,availability,headcount_at_start,headcount_at_end,
      headcount_as_of,canonical_terminations,turnover_percent)$$,
  'trusted read distinguishes closed previous month from current MTD');

reset role;
select is((select count(*) from public.activity_events where company_id='22000000-0000-4000-8000-000000000001'
  and activity_type='turnover.administrative_read' and visibility='restricted'),5::bigint,
  'each successful trusted read writes one restricted audit event');
select ok((select bool_and(metadata ? 'reason' and not metadata ? 'employeeId')
  from public.activity_events where company_id='22000000-0000-4000-8000-000000000001'
  and activity_type='turnover.administrative_read'),
  'Turnover audit carries reason but no person identity');

select * from finish();
rollback;
