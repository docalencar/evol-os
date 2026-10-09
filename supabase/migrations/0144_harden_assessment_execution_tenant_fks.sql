begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  v_constraint_drift bigint;
  v_missing_candidate_keys bigint;
  v_nullable_columns bigint;
  v_invalid_rows bigint;
begin
  with expected(name, source_table, source_column, target_table) as (values
    ('assessment_responses_assessment_template_id_fkey', 'assessment_responses', 'assessment_template_id', 'assessment_templates'),
    ('assessment_responses_employee_id_fkey', 'assessment_responses', 'employee_id', 'people'),
    ('assessment_responses_evaluator_id_fkey', 'assessment_responses', 'evaluator_id', 'people'),
    ('assessment_cycle_participants_assessment_cycle_id_fkey', 'assessment_cycle_participants', 'assessment_cycle_id', 'assessment_cycles'),
    ('assessment_cycle_participants_employee_id_fkey', 'assessment_cycle_participants', 'employee_id', 'people')
  )
  select count(*) into v_constraint_drift
  from expected e
  left join pg_constraint con on con.conname=e.name
  left join pg_class source on source.oid=con.conrelid and source.relname=e.source_table
  left join pg_class target on target.oid=con.confrelid and target.relname=e.target_table
  where con.oid is null or source.oid is null or target.oid is null
    or con.contype<>'f' or con.confmatchtype<>'s'
    or con.confupdtype<>'a' or con.confdeltype<>'c' or not con.convalidated
    or array_length(con.conkey,1)<>1 or array_length(con.confkey,1)<>1
    or not exists (select 1 from pg_attribute a where a.attrelid=con.conrelid
      and a.attnum=con.conkey[1] and a.attname=e.source_column)
    or not exists (select 1 from pg_attribute a where a.attrelid=con.confrelid
      and a.attnum=con.confkey[1] and a.attname='id');

  with targets(table_name) as (values
    ('assessment_templates'), ('people'), ('assessment_cycles')
  )
  select count(*) into v_missing_candidate_keys from targets t
  where not exists (
    select 1 from pg_constraint con join pg_class c on c.oid=con.conrelid
    where c.relname=t.table_name and con.contype='u'
      and array_length(con.conkey,1)=2
      and (select array_agg(a.attname::text order by k.ord)
           from unnest(con.conkey) with ordinality k(attnum,ord)
           join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.attnum)
          = array['id','company_id']::text[]
  );

  with expected(table_name,column_name) as (values
    ('assessment_responses','company_id'),
    ('assessment_responses','assessment_template_id'),
    ('assessment_responses','employee_id'),
    ('assessment_responses','evaluator_id'),
    ('assessment_cycle_participants','company_id'),
    ('assessment_cycle_participants','assessment_cycle_id'),
    ('assessment_cycle_participants','employee_id')
  )
  select count(*) into v_nullable_columns from expected e
  left join pg_class c on c.relname=e.table_name
  left join pg_attribute a on a.attrelid=c.oid and a.attname=e.column_name
    and a.attnum>0 and not a.attisdropped
  where a.attnum is null or not a.attnotnull;

  select
    (select count(*) from public.assessment_responses source
      left join public.assessment_templates target on target.id=source.assessment_template_id
      where target.id is null or target.company_id is distinct from source.company_id)
    + (select count(*) from public.assessment_responses source
      left join public.people target on target.id=source.employee_id
      where target.id is null or target.company_id is distinct from source.company_id)
    + (select count(*) from public.assessment_responses source
      left join public.people target on target.id=source.evaluator_id
      where target.id is null or target.company_id is distinct from source.company_id)
    + (select count(*) from public.assessment_cycle_participants source
      left join public.assessment_cycles target on target.id=source.assessment_cycle_id
      where target.id is null or target.company_id is distinct from source.company_id)
    + (select count(*) from public.assessment_cycle_participants source
      left join public.people target on target.id=source.employee_id
      where target.id is null or target.company_id is distinct from source.company_id)
  into v_invalid_rows;

  if v_constraint_drift<>0 or v_missing_candidate_keys<>0
    or v_nullable_columns<>0 or v_invalid_rows<>0 then
    raise exception using errcode='23514',
      message='ASSESSMENT_EXECUTION_TENANT_FK_PREFLIGHT_FAILED',
      detail=format('constraint_drift=%s missing_candidate_keys=%s nullable_columns=%s invalid_rows=%s',
        v_constraint_drift,v_missing_candidate_keys,v_nullable_columns,v_invalid_rows);
  end if;
end;
$$;

create index assessment_responses_template_company_idx
  on public.assessment_responses(assessment_template_id,company_id);

alter table public.assessment_responses
  add constraint assessment_responses_assessment_template_company_fkey_new
    foreign key (assessment_template_id,company_id)
    references public.assessment_templates(id,company_id)
    match simple on update no action on delete cascade not valid,
  add constraint assessment_responses_employee_company_fkey_new
    foreign key (employee_id,company_id)
    references public.people(id,company_id)
    match simple on update no action on delete cascade not valid,
  add constraint assessment_responses_evaluator_company_fkey_new
    foreign key (evaluator_id,company_id)
    references public.people(id,company_id)
    match simple on update no action on delete cascade not valid;

alter table public.assessment_cycle_participants
  add constraint assessment_cycle_participants_assessment_cycle_company_fkey_new
    foreign key (assessment_cycle_id,company_id)
    references public.assessment_cycles(id,company_id)
    match simple on update no action on delete cascade not valid,
  add constraint assessment_cycle_participants_employee_company_fkey_new
    foreign key (employee_id,company_id)
    references public.people(id,company_id)
    match simple on update no action on delete cascade not valid;

alter table public.assessment_responses
  validate constraint assessment_responses_assessment_template_company_fkey_new,
  validate constraint assessment_responses_employee_company_fkey_new,
  validate constraint assessment_responses_evaluator_company_fkey_new;

alter table public.assessment_cycle_participants
  validate constraint assessment_cycle_participants_assessment_cycle_company_fkey_new,
  validate constraint assessment_cycle_participants_employee_company_fkey_new;

alter table public.assessment_responses
  drop constraint assessment_responses_assessment_template_id_fkey,
  drop constraint assessment_responses_employee_id_fkey,
  drop constraint assessment_responses_evaluator_id_fkey;

alter table public.assessment_cycle_participants
  drop constraint assessment_cycle_participants_assessment_cycle_id_fkey,
  drop constraint assessment_cycle_participants_employee_id_fkey;

alter table public.assessment_responses
  rename constraint assessment_responses_assessment_template_company_fkey_new
    to assessment_responses_assessment_template_id_fkey;
alter table public.assessment_responses
  rename constraint assessment_responses_employee_company_fkey_new
    to assessment_responses_employee_id_fkey;
alter table public.assessment_responses
  rename constraint assessment_responses_evaluator_company_fkey_new
    to assessment_responses_evaluator_id_fkey;
alter table public.assessment_cycle_participants
  rename constraint assessment_cycle_participants_assessment_cycle_company_fkey_new
    to assessment_cycle_participants_assessment_cycle_id_fkey;
alter table public.assessment_cycle_participants
  rename constraint assessment_cycle_participants_employee_company_fkey_new
    to assessment_cycle_participants_employee_id_fkey;

notify pgrst, 'reload schema';

commit;
