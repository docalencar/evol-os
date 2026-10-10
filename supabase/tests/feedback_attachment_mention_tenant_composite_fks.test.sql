begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public,pg_temp;
select no_plan();

-- F-DB1d — the six Feedback child FKs are tenant-composite, and the referential
-- actions they had before are preserved rather than normalised.

-- The delete action is asserted PER CONSTRAINT. A blanket `confdeltype='c'`
-- would pass while SET NULL had silently become CASCADE, which on this table
-- would delete attachments when a person is removed.
select is((select count(*) from (values
    ('feedback_attachments_thread_id_fkey','c'),
    ('feedback_attachments_message_id_fkey','c'),
    ('feedback_attachments_uploaded_by_employee_id_fkey','n'),
    ('feedback_mentions_thread_id_fkey','c'),
    ('feedback_mentions_message_id_fkey','c'),
    ('feedback_mentions_mentioned_employee_id_fkey','c')
  ) as expected(name,delete_action)
  join pg_constraint con on con.conname=expected.name
  where con.contype='f' and con.convalidated and con.confmatchtype='s'
    and con.confupdtype='a' and con.confdeltype=expected.delete_action
    and array_length(con.conkey,1)=2 and array_length(con.confkey,1)=2),6::bigint,
  'all six Feedback child FKs are validated composites with their original delete action');

select is((select count(*) from pg_constraint where conname like '%_company_fkey_new'),0::bigint,
  'no temporary FK name survives');

select is((select count(*) from pg_constraint con join pg_class c on c.oid=con.conrelid
  where c.relname in ('feedback_threads','feedback_messages','people') and con.contype='u'
    and array_length(con.conkey,1)=2
    and (select array_agg(a.attname::text order by k.ord) from unnest(con.conkey) with ordinality k(attnum,ord)
      join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.attnum)=array['id','company_id']::text[]),3::bigint,
  'all three target candidate keys remain present');

select ok((select not attnotnull from pg_attribute
  where attrelid='public.feedback_attachments'::regclass and attname='message_id'),
  'feedback_attachments.message_id remains nullable');
select ok((select not attnotnull from pg_attribute
  where attrelid='public.feedback_attachments'::regclass and attname='uploaded_by_employee_id'),
  'feedback_attachments.uploaded_by_employee_id remains nullable');

-- company_id must stay mandatory: the SET NULL column list is only safe while
-- it does, and a nullable company_id would make every composite FK inert under
-- MATCH SIMPLE.
select is((select count(*) from pg_attribute a join pg_class c on c.oid=a.attrelid
  where c.relname in ('feedback_attachments','feedback_mentions')
    and a.attname='company_id' and a.attnotnull),2::bigint,
  'company_id stays NOT NULL on both hardened children');

-- The SET NULL clause must name exactly one column. Asserted on the rendered
-- definition because no catalog column records the SET NULL column list.
select matches(
  (select pg_get_constraintdef(oid) from pg_constraint
    where conname='feedback_attachments_uploaded_by_employee_id_fkey'),
  'ON DELETE SET NULL \(uploaded_by_employee_id\)',
  'the uploader FK nulls only the uploader column, never company_id');

insert into public.companies(id,name,slug) values
 ('fd1d0000-0000-4000-8000-000000000001','F DB1d A','f-db1d-a'),
 ('fd1d0000-0000-4000-8000-000000000002','F DB1d B','f-db1d-b');
-- The acting user is created for REAL, not referenced by a synthetic id. The
-- negative tests below insert in origin mode, so an absent `created_by_user_id`
-- would raise 23503 from the auth.users FK — the same SQLSTATE the tenancy FK
-- raises, and the assertion would pass for the wrong reason.
insert into auth.users(id) values ('fd1d0000-0000-4000-8000-000000000301')
  on conflict (id) do nothing;

set session_replication_role=replica;
insert into public.people(id,company_id,full_name,status) values
 ('fd1d0000-0000-4000-8000-000000000101','fd1d0000-0000-4000-8000-000000000001','A sender','active'),
 ('fd1d0000-0000-4000-8000-000000000102','fd1d0000-0000-4000-8000-000000000001','A receiver','active'),
 ('fd1d0000-0000-4000-8000-000000000103','fd1d0000-0000-4000-8000-000000000001','A uploader','active'),
 ('fd1d0000-0000-4000-8000-000000000104','fd1d0000-0000-4000-8000-000000000001','A mentioned','active'),
 ('fd1d0000-0000-4000-8000-000000000105','fd1d0000-0000-4000-8000-000000000002','B person','active'),
 ('fd1d0000-0000-4000-8000-000000000106','fd1d0000-0000-4000-8000-000000000002','B other','active');
insert into public.feedback_threads(id,company_id,sender_employee_id,receiver_employee_id,created_by_user_id,title) values
 ('fd1d0000-0000-4000-8000-000000000201','fd1d0000-0000-4000-8000-000000000001','fd1d0000-0000-4000-8000-000000000101','fd1d0000-0000-4000-8000-000000000102','fd1d0000-0000-4000-8000-000000000301','A thread'),
 ('fd1d0000-0000-4000-8000-000000000202','fd1d0000-0000-4000-8000-000000000002','fd1d0000-0000-4000-8000-000000000105','fd1d0000-0000-4000-8000-000000000106','fd1d0000-0000-4000-8000-000000000301','B thread');
insert into public.feedback_messages(id,company_id,thread_id,created_by_user_id,content,author_employee_id,type) values
 ('fd1d0000-0000-4000-8000-000000000401','fd1d0000-0000-4000-8000-000000000001','fd1d0000-0000-4000-8000-000000000201','fd1d0000-0000-4000-8000-000000000301','A message','fd1d0000-0000-4000-8000-000000000101','message'),
 ('fd1d0000-0000-4000-8000-000000000402','fd1d0000-0000-4000-8000-000000000002','fd1d0000-0000-4000-8000-000000000202','fd1d0000-0000-4000-8000-000000000301','B message','fd1d0000-0000-4000-8000-000000000105','message');
-- The fixture rows below are inserted in replica mode for ORDER only: every one
-- of them satisfies all six composite FKs, so the suite does not depend on
-- replica mode for referential validity.
insert into public.feedback_attachments(id,company_id,thread_id,message_id,uploaded_by_employee_id,created_by_user_id,file_name,storage_path) values
 ('fd1d0000-0000-4000-8000-000000000501','fd1d0000-0000-4000-8000-000000000001','fd1d0000-0000-4000-8000-000000000201','fd1d0000-0000-4000-8000-000000000401','fd1d0000-0000-4000-8000-000000000103','fd1d0000-0000-4000-8000-000000000301','a.pdf','a/a.pdf');
insert into public.feedback_mentions(id,company_id,thread_id,message_id,mentioned_employee_id) values
 ('fd1d0000-0000-4000-8000-000000000601','fd1d0000-0000-4000-8000-000000000001','fd1d0000-0000-4000-8000-000000000201','fd1d0000-0000-4000-8000-000000000401','fd1d0000-0000-4000-8000-000000000104');
set session_replication_role=origin;

-- Tenant isolation: each of the six relations refuses a parent from another
-- tenant. These are the inserts that the catalog accepted before this slice.
select throws_ok($$insert into public.feedback_attachments(company_id,thread_id,created_by_user_id,file_name,storage_path) values
 ('fd1d0000-0000-4000-8000-000000000002','fd1d0000-0000-4000-8000-000000000201','fd1d0000-0000-4000-8000-000000000301','x.pdf','b/x.pdf')$$,
 '23503',null,'foreign-tenant thread is rejected for an attachment');

select throws_ok($$insert into public.feedback_attachments(company_id,thread_id,message_id,created_by_user_id,file_name,storage_path) values
 ('fd1d0000-0000-4000-8000-000000000002','fd1d0000-0000-4000-8000-000000000202','fd1d0000-0000-4000-8000-000000000401','fd1d0000-0000-4000-8000-000000000301','x.pdf','b/x.pdf')$$,
 '23503',null,'foreign-tenant message is rejected for an attachment');

select throws_ok($$insert into public.feedback_attachments(company_id,thread_id,uploaded_by_employee_id,created_by_user_id,file_name,storage_path) values
 ('fd1d0000-0000-4000-8000-000000000002','fd1d0000-0000-4000-8000-000000000202','fd1d0000-0000-4000-8000-000000000103','fd1d0000-0000-4000-8000-000000000301','x.pdf','b/x.pdf')$$,
 '23503',null,'foreign-tenant uploader is rejected for an attachment');

select throws_ok($$insert into public.feedback_mentions(company_id,thread_id,message_id,mentioned_employee_id) values
 ('fd1d0000-0000-4000-8000-000000000002','fd1d0000-0000-4000-8000-000000000201','fd1d0000-0000-4000-8000-000000000402','fd1d0000-0000-4000-8000-000000000105')$$,
 '23503',null,'foreign-tenant thread is rejected for a mention');

select throws_ok($$insert into public.feedback_mentions(company_id,thread_id,message_id,mentioned_employee_id) values
 ('fd1d0000-0000-4000-8000-000000000002','fd1d0000-0000-4000-8000-000000000202','fd1d0000-0000-4000-8000-000000000401','fd1d0000-0000-4000-8000-000000000105')$$,
 '23503',null,'foreign-tenant message is rejected for a mention');

select throws_ok($$insert into public.feedback_mentions(company_id,thread_id,message_id,mentioned_employee_id) values
 ('fd1d0000-0000-4000-8000-000000000002','fd1d0000-0000-4000-8000-000000000202','fd1d0000-0000-4000-8000-000000000402','fd1d0000-0000-4000-8000-000000000104')$$,
 '23503',null,'foreign-tenant mentioned employee is rejected');

-- MATCH SIMPLE: a NULL reference is not enforced, which is the ADR's semantics
-- for a nullable relation. The row id is pinned so the later assertions target
-- identity rather than a predicate that could match nothing.
select lives_ok($$insert into public.feedback_attachments(id,company_id,thread_id,message_id,uploaded_by_employee_id,created_by_user_id,file_name,storage_path) values
 ('fd1d0000-0000-4000-8000-000000000502','fd1d0000-0000-4000-8000-000000000001','fd1d0000-0000-4000-8000-000000000201',null,null,'fd1d0000-0000-4000-8000-000000000301','n.pdf','a/n.pdf')$$,
 'NULL message_id and NULL uploader remain valid under MATCH SIMPLE');

-- SET NULL, the sharp edge: deleting the uploader must null ONLY the uploader.
select lives_ok($$delete from public.people where id='fd1d0000-0000-4000-8000-000000000103'$$,
  'deleting the uploader is allowed');
select is((select count(*) from public.feedback_attachments
  where id='fd1d0000-0000-4000-8000-000000000501'
    and uploaded_by_employee_id is null
    and company_id='fd1d0000-0000-4000-8000-000000000001'
    and thread_id='fd1d0000-0000-4000-8000-000000000201'),1::bigint,
  'uploader delete nulls only the uploader and preserves company_id and thread_id');

-- CASCADE on the mentioned employee.
select lives_ok($$delete from public.people where id='fd1d0000-0000-4000-8000-000000000104'$$,
  'deleting the mentioned employee is allowed');
select is((select count(*) from public.feedback_mentions where id='fd1d0000-0000-4000-8000-000000000601'),0::bigint,
  'mentioned-employee delete CASCADEs the mention away');

-- CASCADE on the thread removes both children, including the row whose
-- nullable references are NULL.
select lives_ok($$delete from public.feedback_threads where id='fd1d0000-0000-4000-8000-000000000201'$$,
  'deleting the thread is allowed');
select is((select count(*) from public.feedback_attachments
  where id in ('fd1d0000-0000-4000-8000-000000000501','fd1d0000-0000-4000-8000-000000000502')),0::bigint,
  'thread CASCADE removes its attachments, including the one with NULL references');

select * from finish();
rollback;
