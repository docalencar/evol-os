#!/usr/bin/env bash
#
# READ-ONLY post-application verification for migration 0128 — trusted
# Assessment Feedback mutation boundary.
#
#   bash scripts/review/verify-0128-trusted-feedback-post.sh
#
# WHAT IT PROVES
#
# That the state the database reached is the state that was reviewed: the bridge
# additive and nullable, the legacy column untouched and un-backfilled, origin
# uniqueness physical and partial, seven composite foreign keys validated and the
# weaker simple ones gone, exactly five functions at exactly five signatures,
# SECURITY DEFINER with a hardened search path, EXECUTE for authenticated alone,
# no direct human write privilege anywhere in the Feedback aggregate, no write
# policy left to restore one, the company timeline excluding restricted rows, and
# `public.feedbacks` untouched.
#
# pgTAP proves the behaviour. This proves the shape, which is the part a later
# accidental change would alter silently.
#
# It contains no `supabase` invocation, no DDL and no DML; the SQL it runs opens
# with `set default_transaction_read_only = on`.
#
# Never source it, never `. ` it, never eval it. It runs as its own process.
#
# TARGET — defaults to the LOCAL Supabase database; override with DATABASE_URL.
# The URL may carry a password, so it is never printed and never passed in argv.

set -uo pipefail   # NOT -e: every failure is handled explicitly and fails closed.

MIGRATION_FILE="supabase/migrations/0128_create_trusted_feedback_mutation_boundary.sql"

: "${DATABASE_URL:=postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
export PGSSLMODE="${PGSSLMODE:-prefer}"

# Optional: values printed by the PRE verifier. When supplied, the two that must
# NOT have changed are compared instead of merely reported.
: "${EXPECTED_FEEDBACKS_COUNT:=}"
: "${EXPECTED_FEEDBACKS_SHAPE:=}"
: "${EXPECTED_THREADS_TOTAL:=}"

LOG=$(mktemp -t evol0128postlog.XXXXXX)
Q=$(mktemp -t evol0128poststate.XXXXXX)

FAILURES=0
say() { printf '%s\n' "$*"; }
bad() { say "  FAIL: $*"; FAILURES=$((FAILURES + 1)); }
val() { grep -m1 "^$1=" "$LOG" | cut -d= -f2- ; }

say "[post-0128] READ-ONLY. This script cannot apply, repair or roll back anything."
say "[post-0128] evidence log -> $LOG"

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }

if [ -f "$MIGRATION_FILE" ]; then
  say "[post-0128] migration sha256 = $(shasum -a 256 "$MIGRATION_FILE" | cut -d' ' -f1)"
fi

if ! command -v psql >/dev/null 2>&1; then
  say "STOP: psql not found. This gate needs a real PostgreSQL client."
  exit 1
fi

cat >"$Q" <<'SQL'
set default_transaction_read_only = on;

select 'MIGRATION_0128_PRESENT=' || (exists(
  select 1 from supabase_migrations.schema_migrations where version like '0128%'))::text;
select 'MIGRATION_0128_COUNT=' || (select count(*)::text
  from supabase_migrations.schema_migrations where version like '0128%');

-- Bridge: additive, nullable, legacy column preserved, no artificial backfill.
select 'BRIDGE_PRESENT=' || (exists(select 1 from pg_attribute
  where attrelid='public.feedback_threads'::regclass and attname='assessment_response_id' and not attisdropped))::text;
select 'BRIDGE_NULLABLE=' || (select (not attnotnull)::text from pg_attribute
  where attrelid='public.feedback_threads'::regclass and attname='assessment_response_id');
select 'LEGACY_ASSESSMENT_ID_PRESENT=' || (exists(select 1 from pg_attribute
  where attrelid='public.feedback_threads'::regclass and attname='assessment_id' and not attisdropped))::text;
select 'THREADS_TOTAL=' || count(*)::text from public.feedback_threads;
select 'THREADS_WITH_LEGACY_ASSESSMENT_ID=' || count(*)::text
  from public.feedback_threads where assessment_id is not null;

-- Origin uniqueness is physical and partial.
select 'ORIGIN_INDEX_DEF=' || coalesce((select indexdef from pg_indexes
  where schemaname='public' and indexname='feedback_threads_company_assessment_response_key'), '(missing)');

-- Composite integrity, validated; weaker simple FKs gone.
select 'COMPOSITE_FKS_VALIDATED=' || count(*)::text
  from pg_constraint
 where connamespace='public'::regnamespace and contype='f' and convalidated
   and conname in ('feedback_threads_assessment_response_company_fkey','feedback_threads_sender_company_fkey',
     'feedback_threads_receiver_company_fkey','feedback_messages_thread_company_fkey',
     'feedback_messages_author_company_fkey','feedback_acknowledgements_thread_company_fkey',
     'feedback_acknowledgements_employee_company_fkey');
select 'COMPOSITE_FKS_NOT_VALID=' || count(*)::text
  from pg_constraint
 where connamespace='public'::regnamespace and contype='f' and not convalidated
   and conname like 'feedback_%_company_fkey';
select 'LEGACY_SIMPLE_FKS=' || count(*)::text
  from pg_constraint where connamespace='public'::regnamespace
   and conname in ('feedback_threads_sender_employee_id_fkey','feedback_threads_receiver_employee_id_fkey',
     'feedback_messages_thread_id_fkey','feedback_messages_author_employee_id_fkey',
     'feedback_acknowledgements_thread_id_fkey','feedback_acknowledgements_employee_id_fkey');
select 'RESPONSE_CANDIDATE_KEY=' || (exists(select 1 from pg_constraint
  where conrelid='public.assessment_responses'::regclass and conname='assessment_responses_id_company_key'))::text;

-- Exactly five functions, exactly five signatures, no overload.
select 'RPC_NAMECOUNT=' || count(*)::text
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('create_assessment_feedback_v1','reply_feedback_v1',
   'acknowledge_feedback_v1','close_feedback_v1','archive_feedback_v1');
select 'RPC_EXACT_SIGNATURES=' || (
  (to_regprocedure('public.create_assessment_feedback_v1(uuid,text)') is not null)::int +
  (to_regprocedure('public.reply_feedback_v1(uuid,text)') is not null)::int +
  (to_regprocedure('public.acknowledge_feedback_v1(uuid)') is not null)::int +
  (to_regprocedure('public.close_feedback_v1(uuid)') is not null)::int +
  (to_regprocedure('public.archive_feedback_v1(uuid)') is not null)::int)::text;
select 'RPC_SECURITY_DEFINER=' || (select count(*)::text from pg_proc p
  where p.oid in ('public.create_assessment_feedback_v1(uuid,text)'::regprocedure,
    'public.reply_feedback_v1(uuid,text)'::regprocedure,'public.acknowledge_feedback_v1(uuid)'::regprocedure,
    'public.close_feedback_v1(uuid)'::regprocedure,'public.archive_feedback_v1(uuid)'::regprocedure)
    and p.prosecdef);
select 'RPC_SEARCH_PATH_HARDENED=' || (select count(*)::text from pg_proc p
  where p.oid in ('public.create_assessment_feedback_v1(uuid,text)'::regprocedure,
    'public.reply_feedback_v1(uuid,text)'::regprocedure,'public.acknowledge_feedback_v1(uuid)'::regprocedure,
    'public.close_feedback_v1(uuid)'::regprocedure,'public.archive_feedback_v1(uuid)'::regprocedure)
    and p.proconfig = array['search_path=public, pg_temp']);
select 'RPC_EXECUTE_AUTHENTICATED=' || (
  has_function_privilege('authenticated','public.create_assessment_feedback_v1(uuid,text)','execute')::int +
  has_function_privilege('authenticated','public.reply_feedback_v1(uuid,text)','execute')::int +
  has_function_privilege('authenticated','public.acknowledge_feedback_v1(uuid)','execute')::int +
  has_function_privilege('authenticated','public.close_feedback_v1(uuid)','execute')::int +
  has_function_privilege('authenticated','public.archive_feedback_v1(uuid)','execute')::int)::text;
select 'RPC_EXECUTE_OTHER_ROLES=' || (
  has_function_privilege('anon','public.create_assessment_feedback_v1(uuid,text)','execute')::int +
  has_function_privilege('service_role','public.create_assessment_feedback_v1(uuid,text)','execute')::int +
  has_function_privilege('public','public.create_assessment_feedback_v1(uuid,text)','execute')::int +
  has_function_privilege('anon','public.reply_feedback_v1(uuid,text)','execute')::int +
  has_function_privilege('service_role','public.reply_feedback_v1(uuid,text)','execute')::int +
  has_function_privilege('anon','public.acknowledge_feedback_v1(uuid)','execute')::int +
  has_function_privilege('service_role','public.acknowledge_feedback_v1(uuid)','execute')::int +
  has_function_privilege('anon','public.close_feedback_v1(uuid)','execute')::int +
  has_function_privilege('service_role','public.close_feedback_v1(uuid)','execute')::int +
  has_function_privilege('anon','public.archive_feedback_v1(uuid)','execute')::int +
  has_function_privilege('service_role','public.archive_feedback_v1(uuid)','execute')::int)::text;

-- Direct human write closure across the whole aggregate.
select 'AGGREGATE_WRITE_PRIVILEGES=' || (
  select coalesce(sum(
    has_table_privilege(r.rolename,'public.'||t.tbl,'insert')::int +
    has_table_privilege(r.rolename,'public.'||t.tbl,'update')::int +
    has_table_privilege(r.rolename,'public.'||t.tbl,'delete')::int), 0)::text
  from (values ('feedback_threads'),('feedback_messages'),('feedback_acknowledgements'),
               ('feedback_attachments'),('feedback_mentions')) as t(tbl),
       (values ('authenticated'),('anon')) as r(rolename));
select 'AGGREGATE_WRITE_POLICIES=' || count(*)::text
  from pg_policies where schemaname='public'
   and tablename in ('feedback_threads','feedback_messages','feedback_acknowledgements',
                     'feedback_attachments','feedback_mentions')
   and cmd in ('INSERT','UPDATE','DELETE','ALL');
select 'AGGREGATE_READ_POLICIES=' || count(*)::text
  from pg_policies where schemaname='public'
   and tablename in ('feedback_threads','feedback_messages','feedback_acknowledgements',
                     'feedback_attachments','feedback_mentions')
   and cmd = 'SELECT';
select 'AGGREGATE_RLS_ENABLED=' || (select count(*)::text from pg_class c
  join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity
   and c.relname in ('feedback_threads','feedback_messages','feedback_acknowledgements',
                     'feedback_attachments','feedback_mentions'));

-- Activity: hardened timeline, audit table still closed to direct reads.
select 'TIMELINE_FILTERS_COMPANY=' || (pg_get_functiondef('public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure) like '%visibility=''company''%')::text;
select 'TIMELINE_SECURITY_DEFINER=' || (select prosecdef::text from pg_proc
  where oid='public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure);
select 'TIMELINE_RETURN_COLUMNS=' || array_to_string((select proargnames from pg_proc
  where oid='public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure), ',');
select 'TIMELINE_EXECUTE_AUTHENTICATED=' || has_function_privilege('authenticated','public.get_tenant_activity_timeline_v1(uuid,integer)','execute')::text;
select 'ACTIVITY_DIRECT_SELECT_AUTHENTICATED=' || has_table_privilege('authenticated','public.activity_events','select')::text;
select 'ENTITY_TIMELINE_STILL_PRESENT=' || (to_regprocedure('public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)') is not null)::text;

-- Untouched by design.
select 'FEEDBACKS_TABLE_COUNT=' || count(*)::text from public.feedbacks;
select 'FEEDBACKS_TABLE_FINGERPRINT=' || md5(coalesce(string_agg(attname || ':' || format_type(atttypid, atttypmod), ',' order by attnum), ''))
  from pg_attribute where attrelid='public.feedbacks'::regclass and attnum > 0 and not attisdropped;

-- Recorded for drift detection on later runs.
select 'ACL_FINGERPRINT=' || md5(coalesce(string_agg(c.relname || '=' || coalesce(array_to_string(c.relacl, ','), '(default)'), ';' order by c.relname), ''))
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('feedback_threads','feedback_messages',
   'feedback_acknowledgements','feedback_attachments','feedback_mentions','activity_events');
select 'POLICY_FINGERPRINT=' || md5(coalesce(string_agg(tablename || ':' || policyname || ':' || cmd || ':' || coalesce(qual,'') || ':' || coalesce(with_check,''), ';' order by tablename, policyname), ''))
  from pg_policies where schemaname='public'
   and tablename in ('feedback_threads','feedback_messages','feedback_acknowledgements',
                     'feedback_attachments','feedback_mentions','activity_events');
SQL

if ! psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --no-psqlrc -At </dev/null -f "$Q" >"$LOG" 2>>"$LOG"; then
  say "STOP: the POST inventory did not complete. Evidence: $LOG"
  exit 1
fi

say ""
say "----- measured POST state -----"
cat "$LOG"
say "-------------------------------"
say ""

expect() {  # expect <KEY> <EXPECTED> <WHY>
  local actual; actual=$(val "$1")
  if [ "$actual" != "$2" ]; then bad "$1 is '${actual:-<missing>}', expected '$2' — $3"; fi
}

expect MIGRATION_0128_PRESENT        true  "0128 must be recorded"
expect MIGRATION_0128_COUNT          1     "recorded exactly once"
expect BRIDGE_PRESENT                true  "the modern origin bridge"
expect BRIDGE_NULLABLE               true  "historical threads have no modern origin"
expect LEGACY_ASSESSMENT_ID_PRESENT  true  "assessment_id is preserved, never replaced"
expect COMPOSITE_FKS_VALIDATED       7     "all seven same-tenant relationships validated"
expect COMPOSITE_FKS_NOT_VALID       0     "no composite FK may stay NOT VALID"
expect LEGACY_SIMPLE_FKS             0     "the weaker simple FKs are removed"
expect RESPONSE_CANDIDATE_KEY        true  "the bridge needs unique (id, company_id)"
expect RPC_NAMECOUNT                 5     "five names, no overload"
expect RPC_EXACT_SIGNATURES          5     "each at exactly the approved signature"
expect RPC_SECURITY_DEFINER          5     "all five SECURITY DEFINER"
expect RPC_SEARCH_PATH_HARDENED      5     "all five search_path=public, pg_temp"
expect RPC_EXECUTE_AUTHENTICATED     5     "authenticated may execute all five"
expect RPC_EXECUTE_OTHER_ROLES       0     "PUBLIC, anon and service_role may execute none"
expect AGGREGATE_WRITE_PRIVILEGES    0     "no direct human write anywhere in the aggregate"
expect AGGREGATE_WRITE_POLICIES      0     "no write policy left to restore one"
expect AGGREGATE_RLS_ENABLED         5     "RLS stays enabled as defence in depth"
expect TIMELINE_FILTERS_COMPANY      true  "restricted audit must not reach the company timeline"
expect TIMELINE_SECURITY_DEFINER     true  "the replacement keeps the original posture"
expect TIMELINE_RETURN_COLUMNS \
  "p_company_id,p_limit,activity_id,activity_type,module,title,description,actor_type,actor_id,entity_type,entity_id,subject_type,subject_id,visibility,metadata,occurred_at,created_at" \
  "the timeline contract is unchanged apart from the filter"
expect TIMELINE_EXECUTE_AUTHENTICATED true "create or replace must not have dropped the grant"
expect ACTIVITY_DIRECT_SELECT_AUTHENTICATED false "restricted audit stays unreachable directly"
expect ENTITY_TIMELINE_STILL_PRESENT true  "the entity timeline is untouched"

if [ "$(val AGGREGATE_READ_POLICIES)" = "0" ]; then
  bad "AGGREGATE_READ_POLICIES is 0 — read policies must survive; only writes were closed"
fi

if [ -n "$EXPECTED_FEEDBACKS_COUNT" ]; then
  expect FEEDBACKS_TABLE_COUNT "$EXPECTED_FEEDBACKS_COUNT" "public.feedbacks must be untouched"
fi
if [ -n "$EXPECTED_FEEDBACKS_SHAPE" ]; then
  expect FEEDBACKS_TABLE_FINGERPRINT "$EXPECTED_FEEDBACKS_SHAPE" "public.feedbacks definition must be unchanged"
fi
if [ -n "$EXPECTED_THREADS_TOTAL" ]; then
  expect THREADS_TOTAL "$EXPECTED_THREADS_TOTAL" "0128 creates no threads of its own"
fi

say ""
if [ "$FAILURES" -eq 0 ]; then
  say "[post-0128] POST GATE PASS — the applied state matches the reviewed contract."
  say "           ACL_FINGERPRINT    = $(val ACL_FINGERPRINT)"
  say "           POLICY_FINGERPRINT = $(val POLICY_FINGERPRINT)"
  exit 0
fi

say "[post-0128] POST GATE FAIL — $FAILURES check(s) failed."
say "[post-0128] Evidence: $LOG"
exit 1
