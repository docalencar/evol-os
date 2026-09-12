#!/usr/bin/env bash
#
# READ-ONLY pre-promotion verification for migration 0128 — trusted Assessment
# Feedback mutation boundary.
#
#   bash scripts/review/verify-0128-trusted-feedback-pre.sh
#
# WHAT IT IS FOR
#
# Everything migration 0128 does is additive and irreversible in practice: a
# bridge column, three candidate keys, seven composite foreign keys, a unique
# index, five functions, a replaced timeline function, dropped write policies
# and revoked table privileges. This script proves, before any of that runs,
# that the target is in the state the migration was written against — and stops
# if it is not. It never repairs anything.
#
# It contains no `supabase` invocation, no DDL and no DML. Every SQL file it
# runs opens with `set default_transaction_read_only = on`, so a write would be
# refused by Postgres even if one were somehow introduced here.
#
# WHY THIS IS A FILE AND NOT A PASTED BLOCK
#
# Pasted multi-line control flow can execute against the operator's own shell.
# This runs as its OWN PROCESS. Never source it, never `. ` it, never eval it.
#
# TARGET
#
# Defaults to the LOCAL Supabase database. Point it at another target with
# DATABASE_URL. Production is never a valid target for this repository.
#
#   DATABASE_URL="postgresql://..." bash scripts/review/verify-0128-trusted-feedback-pre.sh
#
# The URL may contain a password, so it is never printed and never placed in a
# command line that another process could observe: psql reads it from the
# environment.

set -uo pipefail   # NOT -e: every failure is handled explicitly and fails closed.

MIGRATION_FILE="supabase/migrations/0128_create_trusted_feedback_mutation_boundary.sql"
PGTAP_FILE="supabase/tests/trusted_feedback_mutation_boundary.test.sql"

: "${DATABASE_URL:=postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
export PGSSLMODE="${PGSSLMODE:-prefer}"

LOG=$(mktemp -t evol0128prelog.XXXXXX)
Q=$(mktemp -t evol0128prestate.XXXXXX)

FAILURES=0
say() { printf '%s\n' "$*"; }
bad() { say "  FAIL: $*"; FAILURES=$((FAILURES + 1)); }
val() { grep -m1 "^$1=" "$LOG" | cut -d= -f2- ; }

say "[pre-0128] READ-ONLY. This script cannot apply, repair or roll back anything."
say "[pre-0128] evidence log -> $LOG"

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }

if [ ! -f "$MIGRATION_FILE" ]; then say "STOP: $MIGRATION_FILE not found"; exit 1; fi
if [ ! -f "$PGTAP_FILE" ]; then say "STOP: $PGTAP_FILE not found"; exit 1; fi

MIG_SHA=$(shasum -a 256 "$MIGRATION_FILE" | cut -d' ' -f1)
TAP_SHA=$(shasum -a 256 "$PGTAP_FILE" | cut -d' ' -f1)
say "[pre-0128] migration sha256 = $MIG_SHA"
say "[pre-0128] pgTAP     sha256 = $TAP_SHA"

if ! command -v psql >/dev/null 2>&1; then
  say "STOP: psql not found. This gate needs a real PostgreSQL client."
  exit 1
fi

cat >"$Q" <<'SQL'
set default_transaction_read_only = on;

-- 0128 must not be recorded yet.
select 'MIGRATION_0128_PRESENT=' || (exists(
  select 1 from supabase_migrations.schema_migrations where version like '0128%'))::text;
select 'MIGRATION_HISTORY_TAIL=' || coalesce(string_agg(version, ',' order by version), '(none)')
  from (select version from supabase_migrations.schema_migrations order by version desc limit 5) t;

-- None of the five names may exist at any signature.
select 'RPC_NAMECOUNT=' || count(*)::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('create_assessment_feedback_v1','reply_feedback_v1',
                     'acknowledge_feedback_v1','close_feedback_v1','archive_feedback_v1');

-- Bridge, its uniqueness and the constraint names 0128 claims.
select 'BRIDGE_COLUMN_PRESENT=' || (exists(
  select 1 from pg_attribute
   where attrelid = 'public.feedback_threads'::regclass
     and attname = 'assessment_response_id' and not attisdropped))::text;
select 'ORIGIN_INDEX_PRESENT=' || (exists(
  select 1 from pg_class
   where relnamespace = 'public'::regnamespace
     and relname = 'feedback_threads_company_assessment_response_key'))::text;
select 'CLAIMED_CONSTRAINTS_PRESENT=' || count(*)::text
  from pg_constraint
 where connamespace = 'public'::regnamespace
   and conname in ('assessment_responses_id_company_key','feedback_threads_id_company_key',
     'feedback_messages_id_company_key','feedback_threads_assessment_response_company_fkey',
     'feedback_threads_sender_company_fkey','feedback_threads_receiver_company_fkey',
     'feedback_messages_thread_company_fkey','feedback_messages_author_company_fkey',
     'feedback_acknowledgements_thread_company_fkey','feedback_acknowledgements_employee_company_fkey');

-- The simple FKs 0128 drops must still be there, or the migration is not
-- running against the schema it was written for.
select 'LEGACY_SIMPLE_FKS=' || count(*)::text
  from pg_constraint
 where connamespace = 'public'::regnamespace
   and conname in ('feedback_threads_sender_employee_id_fkey','feedback_threads_receiver_employee_id_fkey',
     'feedback_messages_thread_id_fkey','feedback_messages_author_employee_id_fkey',
     'feedback_acknowledgements_thread_id_fkey','feedback_acknowledgements_employee_id_fkey');

-- Rows the new composite foreign keys could not validate. Any non-zero is HOLD,
-- never an automatic repair.
select 'CROSS_TENANT_THREAD_PEOPLE=' || count(*)::text
  from public.feedback_threads t
  left join public.people s on s.id = t.sender_employee_id and s.company_id = t.company_id
  left join public.people r on r.id = t.receiver_employee_id and r.company_id = t.company_id
 where s.id is null or r.id is null;
select 'CROSS_TENANT_MESSAGES=' || count(*)::text
  from public.feedback_messages m
  left join public.feedback_threads t on t.id = m.thread_id and t.company_id = m.company_id
  left join public.people a on a.id = m.author_employee_id and a.company_id = m.company_id
 where t.id is null or (m.author_employee_id is not null and a.id is null);
select 'CROSS_TENANT_ACKNOWLEDGEMENTS=' || count(*)::text
  from public.feedback_acknowledgements a
  left join public.feedback_threads t on t.id = a.thread_id and t.company_id = a.company_id
  left join public.people p on p.id = a.employee_id and p.company_id = a.company_id
 where t.id is null or p.id is null;
select 'DUPLICATE_RESPONSE_CANDIDATE_KEY=' || (exists(
  select 1 from public.assessment_responses group by id, company_id having count(*) > 1))::text;

-- Legacy origin is preserved, never inferred: recorded for the POST comparison.
select 'THREADS_TOTAL=' || count(*)::text from public.feedback_threads;
select 'THREADS_WITH_LEGACY_ASSESSMENT_ID=' || count(*)::text
  from public.feedback_threads where assessment_id is not null;
select 'FEEDBACKS_TABLE_COUNT=' || count(*)::text from public.feedbacks;
select 'FEEDBACKS_TABLE_FINGERPRINT=' || md5(coalesce(string_agg(attname || ':' || format_type(atttypid, atttypmod), ',' order by attnum), ''))
  from pg_attribute where attrelid = 'public.feedbacks'::regclass and attnum > 0 and not attisdropped;

-- Security baseline that 0128 changes. POST compares against these.
select 'ACL_FINGERPRINT=' || md5(coalesce(string_agg(c.relname || '=' || coalesce(array_to_string(c.relacl, ','), '(default)'), ';' order by c.relname), ''))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('feedback_threads','feedback_messages','feedback_acknowledgements',
                     'feedback_attachments','feedback_mentions','activity_events');
select 'POLICY_FINGERPRINT=' || md5(coalesce(string_agg(tablename || ':' || policyname || ':' || cmd || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ';' order by tablename, policyname), ''))
  from pg_policies where schemaname = 'public'
   and tablename in ('feedback_threads','feedback_messages','feedback_acknowledgements',
                     'feedback_attachments','feedback_mentions','activity_events');
select 'WRITE_POLICY_COUNT=' || count(*)::text
  from pg_policies where schemaname = 'public'
   and tablename in ('feedback_threads','feedback_messages','feedback_acknowledgements',
                     'feedback_attachments','feedback_mentions')
   and cmd in ('INSERT','UPDATE','DELETE','ALL');
select 'RLS_FINGERPRINT=' || md5(coalesce(string_agg(c.relname || '=' || c.relrowsecurity::text || '/' || c.relforcerowsecurity::text, ';' order by c.relname), ''))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('feedback_threads','feedback_messages','feedback_acknowledgements',
                     'feedback_attachments','feedback_mentions','activity_events');

-- The timeline function about to be replaced.
select 'TIMELINE_PRESENT=' || (to_regprocedure('public.get_tenant_activity_timeline_v1(uuid,integer)') is not null)::text;
select 'TIMELINE_BODY_MD5=' || md5(pg_get_functiondef('public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure));
select 'TIMELINE_FILTERS_COMPANY=' || (pg_get_functiondef('public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure) like '%visibility=''company''%')::text;
select 'ACTIVITY_DIRECT_SELECT_AUTHENTICATED=' || has_table_privilege('authenticated','public.activity_events','select')::text;
SQL

if ! psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --no-psqlrc -At </dev/null -f "$Q" >"$LOG" 2>>"$LOG"; then
  say "STOP: the PRE inventory did not complete. Evidence: $LOG"
  exit 1
fi

say ""
say "----- measured PRE state -----"
cat "$LOG"
say "------------------------------"
say ""

expect() {  # expect <KEY> <EXPECTED> <WHY>
  local actual; actual=$(val "$1")
  if [ "$actual" != "$2" ]; then bad "$1 is '${actual:-<missing>}', expected '$2' — $3"; fi
}

expect MIGRATION_0128_PRESENT            false "0128 must not be applied yet"
expect RPC_NAMECOUNT                     0     "none of the five function names may exist at any signature"
expect BRIDGE_COLUMN_PRESENT             false "the bridge column must not exist yet"
expect ORIGIN_INDEX_PRESENT              false "the origin unique index must not exist yet"
expect CLAIMED_CONSTRAINTS_PRESENT       0     "0128 claims these constraint names"
expect LEGACY_SIMPLE_FKS                 6     "0128 drops exactly these six simple foreign keys"
expect CROSS_TENANT_THREAD_PEOPLE        0     "an existing cross-tenant participant is a HOLD, not a repair"
expect CROSS_TENANT_MESSAGES             0     "an existing cross-tenant message is a HOLD, not a repair"
expect CROSS_TENANT_ACKNOWLEDGEMENTS     0     "an existing cross-tenant acknowledgement is a HOLD, not a repair"
expect DUPLICATE_RESPONSE_CANDIDATE_KEY  false "unique (id, company_id) on assessment_responses must be creatable"
expect TIMELINE_PRESENT                  true  "0128 replaces this function; it must already exist"
expect TIMELINE_FILTERS_COMPANY          false "the company filter is what 0128 adds"
expect WRITE_POLICY_COUNT                9     "0128 removes the historical write policies"

say ""
if [ "$FAILURES" -eq 0 ]; then
  say "[pre-0128] PRE GATE PASS — the target is in the state 0128 was written against."
  say "[pre-0128] Record these fingerprints; the POST verifier compares against them:"
  say "           ACL_FINGERPRINT     = $(val ACL_FINGERPRINT)"
  say "           POLICY_FINGERPRINT  = $(val POLICY_FINGERPRINT)"
  say "           RLS_FINGERPRINT     = $(val RLS_FINGERPRINT)"
  say "           TIMELINE_BODY_MD5   = $(val TIMELINE_BODY_MD5)"
  say "           THREADS_TOTAL       = $(val THREADS_TOTAL)"
  say "           FEEDBACKS_COUNT     = $(val FEEDBACKS_TABLE_COUNT)"
  say "           FEEDBACKS_SHAPE     = $(val FEEDBACKS_TABLE_FINGERPRINT)"
  exit 0
fi

say "[pre-0128] PRE GATE HOLD — $FAILURES assumption(s) failed. Do not apply 0128."
say "[pre-0128] Evidence: $LOG"
exit 1
