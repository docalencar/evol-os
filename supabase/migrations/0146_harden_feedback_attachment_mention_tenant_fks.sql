begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- F-DB1d — the six remaining Feedback child FKs become tenant-composite.
--
-- 0128 hardened seven Feedback constraints but never touched `feedback_attachments`
-- and `feedback_mentions`; the ADR-0012 sweep has carried them as debt since.
-- Measured on real PostgreSQL 17 against the full migration sequence: Foundation
-- offenders 30 PRE, 24 POST, and a cross-tenant attachment is accepted TODAY and
-- rejected with 23503 afterwards.
--
-- ON DELETE actions are PRESERVED per constraint, not normalised. Five are
-- CASCADE. The sixth, `feedback_attachments.uploaded_by_employee_id`, is
-- SET NULL — and that is the sharp edge of this migration:
--
--   `on delete set null` on a composite key nulls EVERY referencing column, so
--   it would try to null `company_id`, which is NOT NULL. Proven locally: the
--   naive form fails with 23502. The column-list form,
--   `on delete set null (uploaded_by_employee_id)` (PostgreSQL 15+), nulls only
--   the author pointer and leaves `company_id` and `thread_id` intact. Deleting
--   a person must never erase the tenant of their attachment.

do $$
declare
  v_constraint_drift bigint;
  v_candidate_key_drift bigint;
  v_column_drift bigint;
  v_invalid_rows bigint;
  v_conflicts bigint;
  v_zero128_state bigint;
  v_f_db1c_state bigint;
begin
  -- 1. The six constraints must be exactly what this migration expects to
  --    replace: single-column, validated, and carrying the referential action
  --    declared below. `confdeltype` is per constraint because SET NULL ('n')
  --    must not be silently promoted to CASCADE ('c') by a blanket assertion.
  with expected(name, source_table, source_column, target_table, delete_action) as (values
    ('feedback_attachments_thread_id_fkey','feedback_attachments','thread_id','feedback_threads','c'),
    ('feedback_attachments_message_id_fkey','feedback_attachments','message_id','feedback_messages','c'),
    ('feedback_attachments_uploaded_by_employee_id_fkey','feedback_attachments','uploaded_by_employee_id','people','n'),
    ('feedback_mentions_thread_id_fkey','feedback_mentions','thread_id','feedback_threads','c'),
    ('feedback_mentions_message_id_fkey','feedback_mentions','message_id','feedback_messages','c'),
    ('feedback_mentions_mentioned_employee_id_fkey','feedback_mentions','mentioned_employee_id','people','c')
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
    or con.confupdtype<>'a' or con.confdeltype<>e.delete_action or not con.convalidated
    or array_length(con.conkey,1)<>1 or array_length(con.confkey,1)<>1
    or not exists (select 1 from pg_attribute a where a.attrelid=con.conrelid
      and a.attnum=con.conkey[1] and a.attname=e.source_column)
    or not exists (select 1 from pg_attribute a where a.attrelid=con.confrelid
      and a.attnum=con.confkey[1] and a.attname='id');

  -- 2. Every target needs a real `(id, company_id)` candidate key. A unique
  --    INDEX would satisfy PostgreSQL but not the ADR's intent, so the test is
  --    for a unique CONSTRAINT, in that column order.
  with targets(table_name) as (values ('feedback_threads'), ('feedback_messages'), ('people'))
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

  -- 3. Nullability is DECLARED, never demanded. `feedback_attachments.message_id`
  --    and `.uploaded_by_employee_id` stay nullable: under MATCH SIMPLE a NULL
  --    reference is simply not enforced, which is the ADR's semantics for a
  --    nullable relation. `company_id` must be NOT NULL on both children —
  --    without it the composite key would itself be nullable and MATCH SIMPLE
  --    would make the whole constraint inert.
  with expected(table_name,column_name,must_be_not_null) as (values
    ('feedback_attachments','company_id',true),
    ('feedback_attachments','thread_id',true),
    ('feedback_attachments','message_id',false),
    ('feedback_attachments','uploaded_by_employee_id',false),
    ('feedback_mentions','company_id',true),
    ('feedback_mentions','thread_id',true),
    ('feedback_mentions','message_id',true),
    ('feedback_mentions','mentioned_employee_id',true)
  )
  select count(*) into v_column_drift from expected e
  left join pg_class c on c.relname=e.table_name
    and c.relnamespace='public'::regnamespace
  left join pg_attribute a on a.attrelid=c.oid and a.attname=e.column_name
    and a.attnum>0 and not a.attisdropped
  where c.oid is null or a.attnum is null or a.attnotnull<>e.must_be_not_null;

  -- 4. Cross-tenant rows would make VALIDATE fail halfway. Count them BEFORE any
  --    DDL and refuse, rather than discovering them during validation. Nullable
  --    references are excluded, because a NULL reference is not a violation.
  select
    (select count(*) from public.feedback_attachments source
      left join public.feedback_threads target on target.id=source.thread_id
      where target.id is null or target.company_id is distinct from source.company_id)
    + (select count(*) from public.feedback_attachments source
      left join public.feedback_messages target on target.id=source.message_id
      where source.message_id is not null
        and (target.id is null or target.company_id is distinct from source.company_id))
    + (select count(*) from public.feedback_attachments source
      left join public.people target on target.id=source.uploaded_by_employee_id
      where source.uploaded_by_employee_id is not null
        and (target.id is null or target.company_id is distinct from source.company_id))
    + (select count(*) from public.feedback_mentions source
      left join public.feedback_threads target on target.id=source.thread_id
      where target.id is null or target.company_id is distinct from source.company_id)
    + (select count(*) from public.feedback_mentions source
      left join public.feedback_messages target on target.id=source.message_id
      where target.id is null or target.company_id is distinct from source.company_id)
    + (select count(*) from public.feedback_mentions source
      left join public.people target on target.id=source.mentioned_employee_id
      where target.id is null or target.company_id is distinct from source.company_id)
  into v_invalid_rows;

  -- 5. A leftover `_new` name from an interrupted attempt means the database is
  --    mid-flight, not clean. Refuse instead of colliding.
  select count(*) into v_conflicts from pg_constraint
  where conname in (
    'feedback_attachments_thread_company_fkey_new',
    'feedback_attachments_message_company_fkey_new',
    'feedback_attachments_uploader_company_fkey_new',
    'feedback_mentions_thread_company_fkey_new',
    'feedback_mentions_message_company_fkey_new',
    'feedback_mentions_mentioned_employee_company_fkey_new');

  -- 6. Ordering proof. 0128's seven Feedback composites and 0145's two lifecycle
  --    composites must already be in place, so this migration cannot apply to a
  --    database that skipped its predecessors.
  select count(*) into v_zero128_state from pg_constraint
  where conname in (
    'feedback_acknowledgements_employee_company_fkey',
    'feedback_acknowledgements_thread_company_fkey',
    'feedback_messages_author_company_fkey',
    'feedback_messages_thread_company_fkey',
    'feedback_threads_assessment_response_company_fkey',
    'feedback_threads_receiver_company_fkey',
    'feedback_threads_sender_company_fkey')
    and contype='f' and convalidated and array_length(conkey,1)=2
    and array_length(confkey,1)=2;

  select count(*) into v_f_db1c_state from pg_constraint
  where conname in (
    'assessment_responses_assessment_cycle_id_fkey',
    'assessment_answers_assessment_response_id_fkey')
    and contype='f' and convalidated and array_length(conkey,1)=2
    and array_length(confkey,1)=2;

  if v_constraint_drift<>0 or v_candidate_key_drift<>0 or v_column_drift<>0
    or v_invalid_rows<>0 or v_conflicts<>0 or v_zero128_state<>7 or v_f_db1c_state<>2 then
    raise exception using errcode='23514',
      message='FEEDBACK_CHILD_TENANT_FK_PREFLIGHT_FAILED',
      detail=format('constraint_drift=%s candidate_key_drift=%s column_drift=%s invalid_rows=%s conflicts=%s zero128_state=%s f_db1c_state=%s',
        v_constraint_drift,v_candidate_key_drift,v_column_drift,v_invalid_rows,v_conflicts,v_zero128_state,v_f_db1c_state);
  end if;
end;
$$;

alter table public.feedback_attachments
  add constraint feedback_attachments_thread_company_fkey_new
    foreign key (thread_id,company_id)
    references public.feedback_threads(id,company_id)
    match simple on update no action on delete cascade not valid;

alter table public.feedback_attachments
  add constraint feedback_attachments_message_company_fkey_new
    foreign key (message_id,company_id)
    references public.feedback_messages(id,company_id)
    match simple on update no action on delete cascade not valid;

-- The column list is load-bearing: without it this clause nulls company_id too.
alter table public.feedback_attachments
  add constraint feedback_attachments_uploader_company_fkey_new
    foreign key (uploaded_by_employee_id,company_id)
    references public.people(id,company_id)
    match simple on update no action
    on delete set null (uploaded_by_employee_id) not valid;

alter table public.feedback_mentions
  add constraint feedback_mentions_thread_company_fkey_new
    foreign key (thread_id,company_id)
    references public.feedback_threads(id,company_id)
    match simple on update no action on delete cascade not valid;

alter table public.feedback_mentions
  add constraint feedback_mentions_message_company_fkey_new
    foreign key (message_id,company_id)
    references public.feedback_messages(id,company_id)
    match simple on update no action on delete cascade not valid;

alter table public.feedback_mentions
  add constraint feedback_mentions_mentioned_employee_company_fkey_new
    foreign key (mentioned_employee_id,company_id)
    references public.people(id,company_id)
    match simple on update no action on delete cascade not valid;

alter table public.feedback_attachments
  validate constraint feedback_attachments_thread_company_fkey_new;
alter table public.feedback_attachments
  validate constraint feedback_attachments_message_company_fkey_new;
alter table public.feedback_attachments
  validate constraint feedback_attachments_uploader_company_fkey_new;
alter table public.feedback_mentions
  validate constraint feedback_mentions_thread_company_fkey_new;
alter table public.feedback_mentions
  validate constraint feedback_mentions_message_company_fkey_new;
alter table public.feedback_mentions
  validate constraint feedback_mentions_mentioned_employee_company_fkey_new;

alter table public.feedback_attachments
  drop constraint feedback_attachments_thread_id_fkey,
  drop constraint feedback_attachments_message_id_fkey,
  drop constraint feedback_attachments_uploaded_by_employee_id_fkey;
alter table public.feedback_mentions
  drop constraint feedback_mentions_thread_id_fkey,
  drop constraint feedback_mentions_message_id_fkey,
  drop constraint feedback_mentions_mentioned_employee_id_fkey;

-- The rename is load-bearing: PostgREST derives embedding hints from constraint
-- names, so keeping them stable keeps existing API consumers working.
alter table public.feedback_attachments
  rename constraint feedback_attachments_thread_company_fkey_new
    to feedback_attachments_thread_id_fkey;
alter table public.feedback_attachments
  rename constraint feedback_attachments_message_company_fkey_new
    to feedback_attachments_message_id_fkey;
alter table public.feedback_attachments
  rename constraint feedback_attachments_uploader_company_fkey_new
    to feedback_attachments_uploaded_by_employee_id_fkey;
alter table public.feedback_mentions
  rename constraint feedback_mentions_thread_company_fkey_new
    to feedback_mentions_thread_id_fkey;
alter table public.feedback_mentions
  rename constraint feedback_mentions_message_company_fkey_new
    to feedback_mentions_message_id_fkey;
alter table public.feedback_mentions
  rename constraint feedback_mentions_mentioned_employee_company_fkey_new
    to feedback_mentions_mentioned_employee_id_fkey;

do $$
declare
  v_final bigint;
begin
  -- Re-read the catalog rather than trusting the statements above, and assert
  -- the delete action PER CONSTRAINT so a SET NULL that silently became CASCADE
  -- cannot pass.
  with expected(name, delete_action) as (values
    ('feedback_attachments_thread_id_fkey','c'),
    ('feedback_attachments_message_id_fkey','c'),
    ('feedback_attachments_uploaded_by_employee_id_fkey','n'),
    ('feedback_mentions_thread_id_fkey','c'),
    ('feedback_mentions_message_id_fkey','c'),
    ('feedback_mentions_mentioned_employee_id_fkey','c')
  )
  select count(*) into v_final
  from expected e
  join pg_constraint con on con.conname=e.name
  where con.contype='f' and con.convalidated and con.confmatchtype='s'
    and con.confupdtype='a' and con.confdeltype=e.delete_action
    and array_length(con.conkey,1)=2 and array_length(con.confkey,1)=2;

  if v_final<>6 then
    raise exception using errcode='23514',
      message='FEEDBACK_CHILD_TENANT_FK_POSTCONDITION_FAILED',
      detail=format('composite_validated=%s of 6', v_final);
  end if;

  -- company_id must still be mandatory on both children: the SET NULL clause
  -- above is only safe while that holds.
  if (select count(*) from pg_attribute a
      join pg_class c on c.oid=a.attrelid and c.relnamespace='public'::regnamespace
      where c.relname in ('feedback_attachments','feedback_mentions')
        and a.attname='company_id' and a.attnotnull)<>2 then
    raise exception using errcode='23514',
      message='FEEDBACK_CHILD_TENANT_FK_POSTCONDITION_FAILED',
      detail='company_id lost its NOT NULL on a hardened child';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
