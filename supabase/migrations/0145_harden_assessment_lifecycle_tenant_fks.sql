begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  v_constraint_drift bigint;
  v_candidate_key_drift bigint;
  v_column_drift bigint;
  v_invalid_rows bigint;
  v_conflicts bigint;
  v_f_db1b_state bigint;
begin
  with expected(name, source_table, source_column, target_table) as (values
    ('assessment_responses_assessment_cycle_id_fkey', 'assessment_responses', 'assessment_cycle_id', 'assessment_cycles'),
    ('assessment_answers_assessment_response_id_fkey', 'assessment_answers', 'assessment_response_id', 'assessment_responses')
  )
  select count(*) into v_constraint_drift
  from expected e
  left join pg_constraint con on con.conname=e.name
  left join pg_class source on source.oid=con.conrelid
  left join pg_namespace source_ns on source_ns.oid=source.relnamespace
  left join pg_class target on target.oid=con.confrelid
  left join pg_namespace target_ns on target_ns.oid=target.relnamespace
  where con.oid is null or source_ns.nspname<>'public' or target_ns.nspname<>'public'
    or source.relname<>e.source_table or target.relname<>e.target_table
    or con.contype<>'f' or con.confmatchtype<>'s'
    or con.confupdtype<>'a' or con.confdeltype<>'c' or not con.convalidated
    or array_length(con.conkey,1)<>1 or array_length(con.confkey,1)<>1
    or not exists (select 1 from pg_attribute a where a.attrelid=con.conrelid
      and a.attnum=con.conkey[1] and a.attname=e.source_column)
    or not exists (select 1 from pg_attribute a where a.attrelid=con.confrelid
      and a.attnum=con.confkey[1] and a.attname='id');

  with targets(table_name) as (values ('assessment_cycles'), ('assessment_responses'))
  select count(*) into v_candidate_key_drift from targets t
  where not exists (
    select 1 from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=t.table_name and con.contype='u'
      and array_length(con.conkey,1)=2
      and (select array_agg(a.attname::text order by k.ord)
           from unnest(con.conkey) with ordinality k(attnum,ord)
           join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.attnum)
          = array['id','company_id']::text[]
  );

  with expected(table_name,column_name,must_be_not_null) as (values
    ('assessment_responses','company_id',true),
    ('assessment_responses','assessment_cycle_id',true),
    ('assessment_answers','company_id',true),
    ('assessment_answers','assessment_response_id',false)
  )
  select count(*) into v_column_drift from expected e
  left join pg_class c on c.relname=e.table_name
    and c.relnamespace='public'::regnamespace
  left join pg_attribute a on a.attrelid=c.oid and a.attname=e.column_name
    and a.attnum>0 and not a.attisdropped
  where c.oid is null or a.attnum is null or a.attnotnull<>e.must_be_not_null;

  select
    (select count(*) from public.assessment_responses source
      left join public.assessment_cycles target on target.id=source.assessment_cycle_id
      where target.id is null or target.company_id is distinct from source.company_id)
    + (select count(*) from public.assessment_answers source
      left join public.assessment_responses target on target.id=source.assessment_response_id
      where source.assessment_response_id is not null
        and (target.id is null or target.company_id is distinct from source.company_id))
  into v_invalid_rows;

  select count(*) into v_conflicts from pg_constraint
  where conname in (
    'assessment_responses_assessment_cycle_company_fkey_new',
    'assessment_answers_assessment_response_company_fkey_new');

  select count(*) into v_f_db1b_state from pg_constraint
  where conname in (
    'assessment_responses_assessment_template_id_fkey',
    'assessment_responses_employee_id_fkey',
    'assessment_responses_evaluator_id_fkey',
    'assessment_cycle_participants_assessment_cycle_id_fkey',
    'assessment_cycle_participants_employee_id_fkey')
    and contype='f' and convalidated and array_length(conkey,1)=2
    and array_length(confkey,1)=2;

  if v_constraint_drift<>0 or v_candidate_key_drift<>0 or v_column_drift<>0
    or v_invalid_rows<>0 or v_conflicts<>0 or v_f_db1b_state<>5 then
    raise exception using errcode='23514',
      message='ASSESSMENT_LIFECYCLE_TENANT_FK_PREFLIGHT_FAILED',
      detail=format('constraint_drift=%s candidate_key_drift=%s column_drift=%s invalid_rows=%s conflicts=%s f_db1b_state=%s',
        v_constraint_drift,v_candidate_key_drift,v_column_drift,v_invalid_rows,v_conflicts,v_f_db1b_state);
  end if;
end;
$$;

alter table public.assessment_responses
  add constraint assessment_responses_assessment_cycle_company_fkey_new
    foreign key (assessment_cycle_id,company_id)
    references public.assessment_cycles(id,company_id)
    match simple on update no action on delete cascade not valid;

alter table public.assessment_answers
  add constraint assessment_answers_assessment_response_company_fkey_new
    foreign key (assessment_response_id,company_id)
    references public.assessment_responses(id,company_id)
    match simple on update no action on delete cascade not valid;

alter table public.assessment_responses
  validate constraint assessment_responses_assessment_cycle_company_fkey_new;
alter table public.assessment_answers
  validate constraint assessment_answers_assessment_response_company_fkey_new;

alter table public.assessment_responses
  drop constraint assessment_responses_assessment_cycle_id_fkey;
alter table public.assessment_answers
  drop constraint assessment_answers_assessment_response_id_fkey;

alter table public.assessment_responses
  rename constraint assessment_responses_assessment_cycle_company_fkey_new
    to assessment_responses_assessment_cycle_id_fkey;
alter table public.assessment_answers
  rename constraint assessment_answers_assessment_response_company_fkey_new
    to assessment_answers_assessment_response_id_fkey;

do $$
begin
  if (select count(*) from pg_constraint
      where conname in (
        'assessment_responses_assessment_cycle_id_fkey',
        'assessment_answers_assessment_response_id_fkey')
        and contype='f' and convalidated and confmatchtype='s'
        and confupdtype='a' and confdeltype='c'
        and array_length(conkey,1)=2 and array_length(confkey,1)=2)<>2 then
    raise exception using errcode='23514',message='ASSESSMENT_LIFECYCLE_TENANT_FK_POSTCONDITION_FAILED';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
