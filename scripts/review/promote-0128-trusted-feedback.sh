#!/usr/bin/env bash
#
# Review promotion gate for migration 0128 — trusted Assessment Feedback
# mutation boundary.
#
#   bash scripts/review/promote-0128-trusted-feedback.sh --local-pgtap-verified
#
# For routine checking AFTER promotion, use the read-only verifier instead — it
# has no code path to a mutation at all:
#
#   DATABASE_URL="postgresql://postgres:<pw>@db.rwfvxvbzaosgcyfxdjpt.supabase.co:5432/postgres" \
#     bash scripts/review/verify-0128-trusted-feedback-post.sh
#
# WHY THIS IS A FILE AND NOT A PASTED BLOCK
#
# Two operator Terminal sessions were once killed by pasting a large runner into
# an interactive shell: pasted multi-line control flow can execute against the
# session itself. This script runs as its OWN PROCESS. Never source it, never
# `. ` it, never eval it, never paste its body.
#
# WHY IT EXISTS NOW
#
# main already carries the application half of E5-DB1: the Feedback Actions call
# reply_feedback_v1, acknowledge_feedback_v1, close_feedback_v1 and
# archive_feedback_v1. `apps/web/vercel.json` deploys main to Review. So while
# 0128 is unapplied there, the deployed app calls functions its database does not
# have. This promotion closes that window. It is NOT part of E2E-5, which is
# blocked on a missing product surface.
#
# ORDER OF OPERATIONS — measure before deciding
#
#   NOT_APPLIED                  -> identity -> TOCTOU -> CLI preflight ->
#                                   isolated dry-run -> exact pending proof ->
#                                   promote 0128 -> POST
#   APPLIED_AND_CONTRACT_PRESENT -> POST only, never db push
#   PARTIALLY_APPLIED            -> fail closed, never db push
#   UNDETERMINED                 -> fail closed, never db push
#
# Those four names are this repository's vocabulary and map one-to-one onto the
# slice brief's READY_TO_APPLY / ALREADY_APPLIED_EXACTLY / DRIFT / UNKNOWN.
#
# IDENTITY IS ANCESTRY PLUS CONTENT, NOT AN EQUALITY ON main
#
# The brief asks to pin the source commit. It is pinned — as an ANCESTOR, which
# is the only form that survives. The 0127 runner documents why an equality
# check against origin/main is backwards: it holds only before the merge that
# publishes the runner and breaks the moment that merge lands, so the script
# would refuse at exactly the moment it is meant to be used. What is enforced
# instead, and is strictly stronger:
#
#   * origin/main is re-fetched and HEAD must equal it, so the operator is
#     demonstrably on canonical main and not on a branch or a stale checkout;
#   * c7c3442 — the merge that put 0128 into main — must be an ANCESTOR of
#     origin/main. False before that merge, true for every main after it;
#   * the migration, both pgTAP files and this runner must match pinned SHA256
#     content hashes AND the blobs canonical main carries. A merge cannot change
#     file content, so these survive it untouched.
#
# The pinned implementation commit does NOT contain this file, which is what
# makes naming it non-circular. This runner verifies ITSELF by content.
#
# ONE DELIBERATE DIFFERENCE FROM THE 0127 RUNNER
#
# 0127 added a function and changed nothing else, so its POST could demand that
# every security fingerprint be byte-identical to phase A. 0128 is the opposite:
# revoking DML and dropping nine write policies is the point. So phase C proves
# the fingerprints CHANGED, and proves the specific post-state structurally —
# zero write privileges, zero write policies, five read policies intact, RLS
# still on. The fingerprints measured locally are recorded below for the record
# and are NOT asserted against Review: Review's baseline grants have never been
# measured, and inventing a constant would fail closed for the wrong reason.
#
# The secret is a bare database password in the macOS Keychain. It is read into
# an environment variable, never printed, never persisted, never placed in argv.

set -uo pipefail   # NOT -e: every failure is handled explicitly and fails closed.

APPROVED_MIGRATION_SHA="f013a4a0cc257653a8f2af5de3a0c17a5173d57ddfdffbf2cdb96c995b3f55a9"
APPROVED_PGTAP_SHA="832a07108aab775deb7be0f5c12c27664e2fd26ae56498ae3fafb1ef0e6cb4de"
APPROVED_TIMELINE_PGTAP_SHA="3b4bf37f3143208709a701764836abcd752f51f3405118effe71c1655b991163"
APPROVED_IMPLEMENTATION_COMMIT="c7c344279130f53005a6d777c261849c119f70dd"
RUNNER_PATH="scripts/review/promote-0128-trusted-feedback.sh"

# Measured on the LOCAL database by the E5-DB1 gate. Recorded, never asserted
# against Review — see the note above.
LOCAL_ACL_FINGERPRINT="9bcfae4fba42b692d1c0fd57bea2a9de"
LOCAL_POLICY_FINGERPRINT="39c6e4ecc91b5c1e5998d27fc034d750"

MIGRATION_FILE="supabase/migrations/0128_create_trusted_feedback_mutation_boundary.sql"
MIGRATION_BASENAME="0128_create_trusted_feedback_mutation_boundary.sql"
PGTAP_FILE="supabase/tests/trusted_feedback_mutation_boundary.test.sql"
TIMELINE_PGTAP_FILE="supabase/tests/tenant_activity_timeline_read_boundary.test.sql"

REVIEW_REF="rwfvxvbzaosgcyfxdjpt"
DB_HOST="db.${REVIEW_REF}.supabase.co"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"

KEYCHAIN_SERVICE="evol-os-review-db"

LOG=$(mktemp -t evol0128log.XXXXXX)
SNAP=$(mktemp -t evol0128snap.XXXXXX)
STATE=$(mktemp -t evol0128state.XXXXXX)
DRY=$(mktemp -t evol0128dry.XXXXXX)
T1=$(mktemp -t evol0128toctou.XXXXXX)
T2=$(mktemp -t evol0128post.XXXXXX)
HELP=$(mktemp -t evol0128help.XXXXXX)
PUSHLOG=$(mktemp -t evol0128push.XXXXXX)

say() { printf '%s\n' "$*"; }
evidence() { say "Evidence: LOG=$LOG STATE=$STATE TOCTOU=$T1 POST=$T2 DRY=$DRY PUSH=$PUSHLOG"; }

say "[0128] evidence log -> $LOG"
say "[0128] target: Review only (ref $REVIEW_REF). Production is never a target of this script."

# --------------------------------------------------------------------------
# local pgTAP gate — an explicit operator assertion, not a default
# --------------------------------------------------------------------------
LOCAL_OK=no
for arg in "$@"; do
  if [ "$arg" = "--local-pgtap-verified" ]; then LOCAL_OK=yes; fi
done
if [ "$LOCAL_OK" != yes ]; then
  say "STOP: this migration has not been asserted as locally validated."
  say "      Run the repository's official database gate first, against THIS content:"
  say "          bash scripts/review/run-0128-local-db-gate.sh"
  say "      APPLY, pgTAP and POST must all pass."
  say "      Then re-run this script with --local-pgtap-verified."
  say "PROMOTION_OUTCOME=NO_MUTATION_LOCAL_GATE_NOT_ASSERTED"
  exit 1
fi
say "[0128] local database gate asserted by operator"

# --------------------------------------------------------------------------
# repo + identity
# --------------------------------------------------------------------------
REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }
say "[0128] repo: $REPO_ROOT"

if ! git fetch --no-tags origin main >>"$LOG" 2>&1; then
  say "STOP: could not fetch origin/main — refusing to judge canonical state from a stale ref"; exit 1
fi

HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
ORIGIN_SHA=$(git rev-parse origin/main 2>/dev/null)
MIG_SHA=$(shasum -a 256 "$MIGRATION_FILE" 2>/dev/null | cut -d' ' -f1)
TAP_SHA=$(shasum -a 256 "$PGTAP_FILE" 2>/dev/null | cut -d' ' -f1)
TTAP_SHA=$(shasum -a 256 "$TIMELINE_PGTAP_FILE" 2>/dev/null | cut -d' ' -f1)
RUN_SHA=$(shasum -a 256 "$REPO_ROOT/$RUNNER_PATH" 2>/dev/null | cut -d' ' -f1)
MIG_CANON=$(git show "origin/main:$MIGRATION_FILE" 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
TAP_CANON=$(git show "origin/main:$PGTAP_FILE" 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
RUN_CANON=$(git show "origin/main:$RUNNER_PATH" 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
DIRTY=$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')

if [ "$DIRTY" != "0" ]; then
  say "STOP: tracked worktree is not clean ($DIRTY change(s)) — refusing to promote an unrecorded file"; exit 1
fi
if [ -z "$ORIGIN_SHA" ]; then
  say "STOP: origin/main could not be resolved"; exit 1
fi
if [ "$HEAD_SHA" != "$ORIGIN_SHA" ]; then
  say "STOP: HEAD is $HEAD_SHA but origin/main is $ORIGIN_SHA."
  say "      Promotion runs from canonical main only. Check out main and pull first."
  exit 1
fi
if ! git merge-base --is-ancestor "$APPROVED_IMPLEMENTATION_COMMIT" origin/main 2>/dev/null; then
  say "STOP: $APPROVED_IMPLEMENTATION_COMMIT is not an ancestor of origin/main."
  say "      0128 has not been merged. Review must never receive a migration main lacks."
  exit 1
fi
if [ "$MIG_SHA" != "$APPROVED_MIGRATION_SHA" ]; then
  say "STOP: migration sha is $MIG_SHA, approved is $APPROVED_MIGRATION_SHA"; exit 1
fi
if [ "$TAP_SHA" != "$APPROVED_PGTAP_SHA" ]; then
  say "STOP: feedback pgTAP sha is $TAP_SHA, approved is $APPROVED_PGTAP_SHA"; exit 1
fi
if [ "$TTAP_SHA" != "$APPROVED_TIMELINE_PGTAP_SHA" ]; then
  say "STOP: timeline pgTAP sha is $TTAP_SHA, approved is $APPROVED_TIMELINE_PGTAP_SHA"; exit 1
fi
if [ "$MIG_SHA" != "$MIG_CANON" ] || [ "$TAP_SHA" != "$TAP_CANON" ]; then
  say "STOP: working tree differs from origin/main for the migration or its pgTAP"; exit 1
fi
if [ -z "$RUN_CANON" ]; then
  say "STOP: $RUNNER_PATH is not present in origin/main — publish the runner before using it"; exit 1
fi
if [ "$RUN_SHA" != "$RUN_CANON" ]; then
  say "STOP: the runner being executed is not the version canonical main carries."
  say "      running=$RUN_SHA canonical=$RUN_CANON"
  exit 1
fi

# The read-only snapshot is host-pinned to db.$REVIEW_REF, but `supabase db push
# --linked` targets whatever supabase/.temp/project-ref says. Nothing in the
# 0127 runner tied those two together, so "Review only" was an assumption rather
# than a proof: a CLI linked elsewhere would let this script measure Review and
# mutate a different project. Prove the link instead.
LINK_FILE="$REPO_ROOT/supabase/.temp/project-ref"
if [ ! -f "$LINK_FILE" ]; then
  say "STOP: $LINK_FILE is absent — the CLI is not linked, so the push target is unprovable"; exit 1
fi
LINKED_REF=$(tr -d '[:space:]' <"$LINK_FILE")
if [ "$LINKED_REF" != "$REVIEW_REF" ]; then
  say "STOP: the supabase CLI is linked to project '$LINKED_REF', not Review ($REVIEW_REF)."
  say "      psql would read Review while db push mutated a different project. Refusing."
  exit 1
fi

say "[0128] identity OK  head=$HEAD_SHA (== origin/main)  branch=$BRANCH"
say "[0128] CLI link verified: push target == psql target == $REVIEW_REF"
say "[0128] $APPROVED_IMPLEMENTATION_COMMIT is an ancestor of origin/main — 0128 is merged"
say "[0128] migration, both pgTAP files and this runner match canonical main"

# --------------------------------------------------------------------------
# credential
# --------------------------------------------------------------------------
DB_PASSWORD="$(security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$USER" -w 2>/dev/null)"
if [ -z "${DB_PASSWORD:-}" ]; then
  say "STOP: keychain credential not found (service=$KEYCHAIN_SERVICE account=$USER)"; exit 1
fi
export PGPASSWORD="$DB_PASSWORD"
say "[0128] credential loaded (never printed); host=$DB_HOST"

runsql() {   # runsql <output-file> <sql-file>
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
       -v ON_ERROR_STOP=1 --no-psqlrc -At </dev/null -f "$2" >"$1" 2>>"$LOG"
}

# --------------------------------------------------------------------------
# CANONICAL SNAPSHOT — one definition, executed by PRE, TOCTOU and POST, so the
# three phases cannot drift apart.
# --------------------------------------------------------------------------
cat >"$SNAP" <<'CANON'
set default_transaction_read_only = on;
select 'DB_IDENTITY=' || current_database();
select 'MIGRATION_0128_PRESENT=' || (exists(select 1 from supabase_migrations.schema_migrations where version like '0128%'))::text;
select 'MIGRATION_0128_COUNT=' || (select count(*)::text from supabase_migrations.schema_migrations where version like '0128%');
select 'MIGRATION_0127_PRESENT=' || (exists(select 1 from supabase_migrations.schema_migrations where version like '0127%'))::text;
select 'MIGRATION_HISTORY_TAIL=' || coalesce(string_agg(version, ',' order by version), '<none>')
  from (select version from supabase_migrations.schema_migrations order by version desc limit 5) t;

select 'BRIDGE_PRESENT=' || (exists(select 1 from pg_attribute
  where attrelid='public.feedback_threads'::regclass and attname='assessment_response_id' and not attisdropped))::text;
select 'BRIDGE_NULLABLE=' || coalesce((select (not attnotnull)::text from pg_attribute
  where attrelid='public.feedback_threads'::regclass and attname='assessment_response_id'), '<absent>');
select 'LEGACY_ASSESSMENT_ID_PRESENT=' || (exists(select 1 from pg_attribute
  where attrelid='public.feedback_threads'::regclass and attname='assessment_id' and not attisdropped))::text;
select 'ORIGIN_UNIQUE_PARTIAL_INDEX=' || coalesce((select indexdef from pg_indexes
  where schemaname='public' and indexname='feedback_threads_company_assessment_response_key'), '<absent>');
select 'RESPONSE_CANDIDATE_KEY=' || (exists(select 1 from pg_constraint
  where conrelid='public.assessment_responses'::regclass and conname='assessment_responses_id_company_key'))::text;

select 'COMPOSITE_FKS_VALIDATED=' || count(*)::text from pg_constraint
 where connamespace='public'::regnamespace and contype='f' and convalidated
   and conname in ('feedback_threads_assessment_response_company_fkey','feedback_threads_sender_company_fkey',
     'feedback_threads_receiver_company_fkey','feedback_messages_thread_company_fkey',
     'feedback_messages_author_company_fkey','feedback_acknowledgements_thread_company_fkey',
     'feedback_acknowledgements_employee_company_fkey');
select 'COMPOSITE_FKS_NOT_VALID=' || count(*)::text from pg_constraint
 where connamespace='public'::regnamespace and contype='f' and not convalidated and conname like 'feedback_%_company_fkey';
select 'LEGACY_SIMPLE_FKS=' || count(*)::text from pg_constraint where connamespace='public'::regnamespace
   and conname in ('feedback_threads_sender_employee_id_fkey','feedback_threads_receiver_employee_id_fkey',
     'feedback_messages_thread_id_fkey','feedback_messages_author_employee_id_fkey',
     'feedback_acknowledgements_thread_id_fkey','feedback_acknowledgements_employee_id_fkey');

select 'RPC_NAMECOUNT=' || count(*)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('create_assessment_feedback_v1','reply_feedback_v1',
   'acknowledge_feedback_v1','close_feedback_v1','archive_feedback_v1');
select 'RPC_EXACT_SIGNATURES=' || (
  (to_regprocedure('public.create_assessment_feedback_v1(uuid,text)') is not null)::int +
  (to_regprocedure('public.reply_feedback_v1(uuid,text)') is not null)::int +
  (to_regprocedure('public.acknowledge_feedback_v1(uuid)') is not null)::int +
  (to_regprocedure('public.close_feedback_v1(uuid)') is not null)::int +
  (to_regprocedure('public.archive_feedback_v1(uuid)') is not null)::int)::text;
-- Overloads ONLY: the five approved signatures are excluded by oid, so a
-- healthy boundary reports (none).
select 'RPC_ALTERNATE_SIGNATURES=' || coalesce(string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ' | ' order by p.oid), '(none)')
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('create_assessment_feedback_v1','reply_feedback_v1',
   'acknowledge_feedback_v1','close_feedback_v1','archive_feedback_v1')
   and p.oid not in (
     coalesce(to_regprocedure('public.create_assessment_feedback_v1(uuid,text)'), 0),
     coalesce(to_regprocedure('public.reply_feedback_v1(uuid,text)'), 0),
     coalesce(to_regprocedure('public.acknowledge_feedback_v1(uuid)'), 0),
     coalesce(to_regprocedure('public.close_feedback_v1(uuid)'), 0),
     coalesce(to_regprocedure('public.archive_feedback_v1(uuid)'), 0));
select 'RPC_SECURITY_DEFINER=' || (select count(*)::text from pg_proc p
  where p.prosecdef and p.oid in (
    coalesce(to_regprocedure('public.create_assessment_feedback_v1(uuid,text)'), 0),
    coalesce(to_regprocedure('public.reply_feedback_v1(uuid,text)'), 0),
    coalesce(to_regprocedure('public.acknowledge_feedback_v1(uuid)'), 0),
    coalesce(to_regprocedure('public.close_feedback_v1(uuid)'), 0),
    coalesce(to_regprocedure('public.archive_feedback_v1(uuid)'), 0)));
select 'RPC_SEARCH_PATH_HARDENED=' || (select count(*)::text from pg_proc p
  where p.proconfig = array['search_path=public, pg_temp'] and p.oid in (
    coalesce(to_regprocedure('public.create_assessment_feedback_v1(uuid,text)'), 0),
    coalesce(to_regprocedure('public.reply_feedback_v1(uuid,text)'), 0),
    coalesce(to_regprocedure('public.acknowledge_feedback_v1(uuid)'), 0),
    coalesce(to_regprocedure('public.close_feedback_v1(uuid)'), 0),
    coalesce(to_regprocedure('public.archive_feedback_v1(uuid)'), 0)));
select 'RPC_EXECUTE_AUTHENTICATED=' || coalesce(sum(
  case when to_regprocedure(signature) is not null
    then has_function_privilege('authenticated', signature, 'execute')::int
    else 0
  end
), 0)::text
from unnest(array[
  'public.create_assessment_feedback_v1(uuid,text)',
  'public.reply_feedback_v1(uuid,text)',
  'public.acknowledge_feedback_v1(uuid)',
  'public.close_feedback_v1(uuid)',
  'public.archive_feedback_v1(uuid)'
]) signature;
select 'RPC_EXECUTE_OTHER_ROLES=' || (
  select coalesce(sum(has_function_privilege(r, p, 'execute')::int), 0)::text
  from unnest(array['anon','service_role','public']) r,
       unnest(array['public.create_assessment_feedback_v1(uuid,text)','public.reply_feedback_v1(uuid,text)',
                    'public.acknowledge_feedback_v1(uuid)','public.close_feedback_v1(uuid)',
                    'public.archive_feedback_v1(uuid)']) p
  where to_regprocedure(p) is not null);

select 'AGGREGATE_WRITE_PRIVILEGES=' || (
  select coalesce(sum(
    has_table_privilege(r,'public.'||t,'insert')::int +
    has_table_privilege(r,'public.'||t,'update')::int +
    has_table_privilege(r,'public.'||t,'delete')::int), 0)::text
  from unnest(array['feedback_threads','feedback_messages','feedback_acknowledgements',
                    'feedback_attachments','feedback_mentions']) t,
       unnest(array['authenticated','anon']) r);
select 'AGGREGATE_WRITE_POLICIES=' || count(*)::text from pg_policies where schemaname='public'
   and tablename in ('feedback_threads','feedback_messages','feedback_acknowledgements',
                     'feedback_attachments','feedback_mentions')
   and cmd in ('INSERT','UPDATE','DELETE','ALL');
select 'AGGREGATE_READ_POLICIES=' || count(distinct tablename)::text from pg_policies where schemaname='public'
   and tablename in ('feedback_threads','feedback_messages','feedback_acknowledgements',
                     'feedback_attachments','feedback_mentions') and cmd='SELECT';
select 'AGGREGATE_RLS_ENABLED=' || count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relrowsecurity
   and c.relname in ('feedback_threads','feedback_messages','feedback_acknowledgements',
                     'feedback_attachments','feedback_mentions');

select 'TIMELINE_FILTERS_COMPANY=' || (pg_get_functiondef('public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure) like '%visibility=''company''%')::text;
select 'TIMELINE_SECURITY_DEFINER=' || (select prosecdef::text from pg_proc where oid='public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure);
select 'TIMELINE_EXECUTE_AUTHENTICATED=' || has_function_privilege('authenticated','public.get_tenant_activity_timeline_v1(uuid,integer)','execute')::text;
select 'TIMELINE_RETURN_COLUMNS=' || array_to_string((select proargnames from pg_proc
  where oid='public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure), ',');
select 'ACTIVITY_DIRECT_SELECT_AUTHENTICATED=' || has_table_privilege('authenticated','public.activity_events','select')::text;
select 'ENTITY_TIMELINE_STILL_PRESENT=' || (to_regprocedure('public.get_tenant_entity_activity_timeline_v1(uuid,text,uuid,integer)') is not null)::text;

select 'FEEDBACKS_TABLE_COUNT=' || count(*)::text from public.feedbacks;
select 'FEEDBACKS_TABLE_FINGERPRINT=' || md5(coalesce(string_agg(attname || ':' || format_type(atttypid, atttypmod), ',' order by attnum), ''))
  from pg_attribute where attrelid='public.feedbacks'::regclass and attnum > 0 and not attisdropped;
select 'THREADS_TOTAL=' || count(*)::text from public.feedback_threads;

select 'ACL_FINGERPRINT=' || md5(coalesce(string_agg(c.relname || '::' || coalesce(array_to_string(c.relacl, ','), '<default>'), '|' order by c.relname), ''))
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('feedback_threads','feedback_messages',
   'feedback_acknowledgements','feedback_attachments','feedback_mentions','activity_events');
select 'POLICY_FINGERPRINT=' || coalesce(md5(string_agg(tablename || '::' || policyname || '::' || cmd || '::' ||
         coalesce(qual,'') || '::' || coalesce(with_check,''), '|' order by tablename, policyname)), '<none>')
  from pg_policies where schemaname='public' and tablename in ('feedback_threads','feedback_messages',
   'feedback_acknowledgements','feedback_attachments','feedback_mentions','activity_events');
select 'RLS_FINGERPRINT=' || md5(coalesce(string_agg(c.relname || '::' || c.relrowsecurity::text || ':' || c.relforcerowsecurity::text, '|' order by c.relname), ''))
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('feedback_threads','feedback_messages',
   'feedback_acknowledgements','feedback_attachments','feedback_mentions','activity_events');
CANON

# --------------------------------------------------------------------------
# PHASE A — measure, then classify
# --------------------------------------------------------------------------
say "[phaseA] measuring Review"
if ! runsql "$STATE" "$SNAP"; then
  say "STOP: PRE snapshot failed — target unreadable. No mutation performed."
  say "PROMOTION_OUTCOME=NO_MUTATION"; evidence; exit 1
fi
sed 's/^/    /' "$STATE"

val() { grep -m1 "^$1=" "$STATE" | cut -d= -f2- ; }

S_M128=$(val MIGRATION_0128_PRESENT);      S_M128N=$(val MIGRATION_0128_COUNT)
S_M127=$(val MIGRATION_0127_PRESENT)
S_BRIDGE=$(val BRIDGE_PRESENT);            S_INDEX=$(val ORIGIN_UNIQUE_PARTIAL_INDEX)
S_NAME=$(val RPC_NAMECOUNT);               S_EXACT=$(val RPC_EXACT_SIGNATURES)
S_ALT=$(val RPC_ALTERNATE_SIGNATURES)
S_SIMPLE=$(val LEGACY_SIMPLE_FKS);         S_COMP=$(val COMPOSITE_FKS_VALIDATED)
S_WPOL=$(val AGGREGATE_WRITE_POLICIES);    S_WPRIV=$(val AGGREGATE_WRITE_PRIVILEGES)
S_RLS=$(val AGGREGATE_RLS_ENABLED);        S_TLC=$(val TIMELINE_FILTERS_COMPANY)
S_ACL=$(val ACL_FINGERPRINT);              S_POL=$(val POLICY_FINGERPRINT)
S_RLSF=$(val RLS_FINGERPRINT)
S_FBC=$(val FEEDBACKS_TABLE_COUNT);        S_FBF=$(val FEEDBACKS_TABLE_FINGERPRINT)
S_LEGACYCOL=$(val LEGACY_ASSESSMENT_ID_PRESENT)

BASELINE_OK=yes
if [ "$S_M127" != "true" ]; then
  say "  BASELINE: 0127 is not applied — Review is behind the migration history this expects"; BASELINE_OK=no
fi
if [ "$S_LEGACYCOL" != "true" ]; then
  say "  BASELINE: feedback_threads.assessment_id is absent — not the schema 0128 was written for"; BASELINE_OK=no
fi
if [ "$S_RLS" != "5" ]; then
  say "  BASELINE: RLS is enabled on $S_RLS of the 5 Feedback relations"; BASELINE_OK=no
fi

CURRENT_STATE=UNDETERMINED
if [ "$S_M128" = "false" ] && [ "$S_NAME" = "0" ] && [ "$S_EXACT" = "0" ] && \
   [ "$S_BRIDGE" = "false" ] && [ "$S_INDEX" = "<absent>" ] && \
   [ "$S_SIMPLE" = "6" ] && [ "$S_WPOL" = "9" ] && [ "$BASELINE_OK" = yes ]; then
  CURRENT_STATE=NOT_APPLIED
elif [ "$S_M128" = "true" ] && [ "$S_M128N" = "1" ] && [ "$S_NAME" = "5" ] && \
     [ "$S_EXACT" = "5" ] && [ "$S_ALT" = "(none)" ] && [ "$S_BRIDGE" = "true" ] && \
     [ "$S_SIMPLE" = "0" ] && [ "$S_COMP" = "7" ] && [ "$S_WPOL" = "0" ] && \
     [ "$S_WPRIV" = "0" ] && [ "$S_TLC" = "true" ] && [ "$BASELINE_OK" = yes ]; then
  CURRENT_STATE=APPLIED_AND_CONTRACT_PRESENT
elif [ "$S_M128" = "true" ] || [ "$S_NAME" != "0" ] || [ "$S_BRIDGE" != "false" ] || [ "$BASELINE_OK" = no ]; then
  CURRENT_STATE=PARTIALLY_APPLIED
fi
say "[phaseA] REVIEW_0128_CURRENT_STATE=$CURRENT_STATE"
say "[phaseA] PRE ACL=$S_ACL POLICY=$S_POL RLS=$S_RLSF"
say "[phaseA] (local reference, not asserted here: ACL=$LOCAL_ACL_FINGERPRINT POLICY=$LOCAL_POLICY_FINGERPRINT)"

if [ "$CURRENT_STATE" = "PARTIALLY_APPLIED" ] || [ "$CURRENT_STATE" = "UNDETERMINED" ]; then
  say "STOP: state is $CURRENT_STATE. No db push. No repair. No rollback."
  say "PROMOTION_OUTCOME=BLOCKED_${CURRENT_STATE}"
  evidence; exit 1
fi

# --------------------------------------------------------------------------
# PHASE B — TOCTOU + promotion, reachable ONLY from NOT_APPLIED
# --------------------------------------------------------------------------
if [ "$CURRENT_STATE" = "NOT_APPLIED" ]; then

  say "[phaseB] TOCTOU re-measure"
  if ! runsql "$T1" "$SNAP"; then
    say "STOP: TOCTOU query failed. No mutation performed."
    say "PROMOTION_OUTCOME=NO_MUTATION"; evidence; exit 1
  fi
  DRIFT=0
  for pair in \
    "MIGRATION_0128_PRESENT=false" \
    "MIGRATION_0127_PRESENT=true" \
    "RPC_NAMECOUNT=0" \
    "RPC_EXACT_SIGNATURES=0" \
    "RPC_ALTERNATE_SIGNATURES=(none)" \
    "BRIDGE_PRESENT=false" \
    "ORIGIN_UNIQUE_PARTIAL_INDEX=<absent>" \
    "LEGACY_SIMPLE_FKS=6" \
    "AGGREGATE_WRITE_POLICIES=9" \
    "AGGREGATE_RLS_ENABLED=5" \
    "ACL_FINGERPRINT=$S_ACL" \
    "POLICY_FINGERPRINT=$S_POL" \
    "RLS_FINGERPRINT=$S_RLSF" \
    "FEEDBACKS_TABLE_COUNT=$S_FBC" \
    "FEEDBACKS_TABLE_FINGERPRINT=$S_FBF"
  do
    if ! grep -Fxq "$pair" "$T1"; then say "  DRIFT expected: [$pair]"; DRIFT=1; fi
  done
  if [ "$DRIFT" -ne 0 ]; then
    say "STOP: TOCTOU does not match what phase A measured. NO MUTATION PERFORMED."
    say "PROMOTION_OUTCOME=NO_MUTATION"; evidence; exit 1
  fi
  say "[phaseB] TOCTOU_VERDICT=MATCHES_PHASE_A"

  say "[phaseB] CLI capability preflight"
  if ! supabase db push --help >"$HELP" 2>&1; then
    say "STOP: cannot read supabase CLI help"; evidence; exit 1
  fi
  YES_FLAG=""
  if ! grep -q -- '--linked' "$HELP"; then say "STOP: CLI lacks --linked"; evidence; exit 1; fi
  if ! grep -q -- '--dry-run' "$HELP"; then say "STOP: CLI lacks --dry-run"; evidence; exit 1; fi
  if grep -q -- '--yes' "$HELP"; then YES_FLAG="--yes"
  elif grep -qE '^[[:space:]]*-y,' "$HELP"; then YES_FLAG="-y"
  else say "STOP: CLI has no verified non-interactive confirmation flag"; evidence; exit 1; fi
  say "[phaseB] CLI flags verified: --linked --dry-run $YES_FLAG"

  export SUPABASE_DB_PASSWORD="$DB_PASSWORD"

  # The dry-run writes to its OWN file; the pending set is derived from that
  # file alone, never from the shared log.
  if ! supabase db push --linked --dry-run </dev/null >"$DRY" 2>&1; then
    say "STOP: dry-run failed. No mutation performed."; tail -20 "$DRY"; cat "$DRY" >>"$LOG"
    say "PROMOTION_OUTCOME=NO_MUTATION"; evidence; exit 1
  fi
  cat "$DRY" >>"$LOG"
  sed 's/^/    /' "$DRY" | tail -20
  PEND=$(grep -oE '0[0-9]{3}_[a-z0-9_]+\.sql' "$DRY" | sort -u | tr '\n' ' ' | sed 's/ $//')
  say "[phaseB] PENDING_SET (from dedicated dry-run file only): ${PEND:-<none>}"
  if [ "$PEND" != "$MIGRATION_BASENAME" ]; then
    say "STOP: pending set is not exactly 0128. NO MUTATION PERFORMED."
    say "PROMOTION_OUTCOME=NO_MUTATION"; evidence; exit 1
  fi

  say "[phaseB] applying migration 0128 to Review ($REVIEW_REF)"
  supabase db push --linked $YES_FLAG </dev/null >"$PUSHLOG" 2>&1
  RC=$?
  cat "$PUSHLOG" >>"$LOG"; tail -15 "$PUSHLOG"
  if [ "$RC" -ne 0 ]; then
    # The push may have partially succeeded. This is UNKNOWN, not FAILED, and an
    # automatic retry could apply a migration twice or on top of a half state.
    say "STOP: db push returned $RC. Outcome is UNKNOWN, not failed."
    say "      Do NOT re-run this script. Inspect the real state first, read-only:"
    say "          bash scripts/review/verify-0128-trusted-feedback-post.sh"
    say "      with DATABASE_URL pointing at Review."
    say "PROMOTION_OUTCOME=UNKNOWN_INSPECT_BEFORE_ANY_RETRY"
    evidence; exit 1
  fi
  say "[phaseB] db push completed rc=0"
fi

# --------------------------------------------------------------------------
# PHASE C — POST, read-only, on both paths
# --------------------------------------------------------------------------
say "[phaseC] POST verification"
POST_OK=1
if ! runsql "$T2" "$SNAP"; then
  say "  POST snapshot unreadable"; POST_OK=0
else
  sed 's/^/    /' "$T2"
fi

if [ "$POST_OK" -eq 1 ]; then
  for want in \
    "MIGRATION_0128_PRESENT=true" \
    "MIGRATION_0128_COUNT=1" \
    "BRIDGE_PRESENT=true" \
    "BRIDGE_NULLABLE=true" \
    "LEGACY_ASSESSMENT_ID_PRESENT=true" \
    "RESPONSE_CANDIDATE_KEY=true" \
    "COMPOSITE_FKS_VALIDATED=7" \
    "COMPOSITE_FKS_NOT_VALID=0" \
    "LEGACY_SIMPLE_FKS=0" \
    "RPC_NAMECOUNT=5" \
    "RPC_EXACT_SIGNATURES=5" \
    "RPC_ALTERNATE_SIGNATURES=(none)" \
    "RPC_SECURITY_DEFINER=5" \
    "RPC_SEARCH_PATH_HARDENED=5" \
    "RPC_EXECUTE_AUTHENTICATED=5" \
    "RPC_EXECUTE_OTHER_ROLES=0" \
    "AGGREGATE_WRITE_PRIVILEGES=0" \
    "AGGREGATE_WRITE_POLICIES=0" \
    "AGGREGATE_READ_POLICIES=5" \
    "AGGREGATE_RLS_ENABLED=5" \
    "TIMELINE_FILTERS_COMPANY=true" \
    "TIMELINE_SECURITY_DEFINER=true" \
    "TIMELINE_EXECUTE_AUTHENTICATED=true" \
    "TIMELINE_RETURN_COLUMNS=p_company_id,p_limit,activity_id,activity_type,module,title,description,actor_type,actor_id,entity_type,entity_id,subject_type,subject_id,visibility,metadata,occurred_at,created_at" \
    "ACTIVITY_DIRECT_SELECT_AUTHENTICATED=false" \
    "ENTITY_TIMELINE_STILL_PRESENT=true" \
    "ORIGIN_UNIQUE_PARTIAL_INDEX=CREATE UNIQUE INDEX feedback_threads_company_assessment_response_key ON public.feedback_threads USING btree (company_id, assessment_response_id) WHERE (assessment_response_id IS NOT NULL)"
  do
    if grep -Fxq "$want" "$T2"; then say "  OK: ${want%%=*}"
    else say "  MISSING: [$want]"; POST_OK=0; fi
  done

  # Untouched by design, and measured before the mutation.
  for chk in "FEEDBACKS_TABLE_COUNT=$S_FBC" "FEEDBACKS_TABLE_FINGERPRINT=$S_FBF" "THREADS_TOTAL=$(val THREADS_TOTAL)"; do
    if grep -Fxq "$chk" "$T2"; then say "  UNCHANGED: ${chk%%=*}"
    else say "  DRIFT: ${chk%%=*} — 0128 must not create or alter rows"; POST_OK=0; fi
  done

  # 0128 exists to change the security posture, so on the NOT_APPLIED path the
  # fingerprints MUST differ from phase A. On the already-applied path they are
  # expected to be identical, because nothing ran.
  P_ACL=$(grep -m1 '^ACL_FINGERPRINT=' "$T2" | cut -d= -f2-)
  P_POL=$(grep -m1 '^POLICY_FINGERPRINT=' "$T2" | cut -d= -f2-)
  if [ "$CURRENT_STATE" = "NOT_APPLIED" ]; then
    if [ "$P_ACL" = "$S_ACL" ]; then say "  DRIFT: ACL fingerprint unchanged — the revoke did not take effect"; POST_OK=0
    else say "  OK: ACL fingerprint changed by the revoke ($S_ACL -> $P_ACL)"; fi
    if [ "$P_POL" = "$S_POL" ]; then say "  DRIFT: policy fingerprint unchanged — the write policies were not dropped"; POST_OK=0
    else say "  OK: policy fingerprint changed by the policy drops ($S_POL -> $P_POL)"; fi
  else
    if [ "$P_ACL" != "$S_ACL" ] || [ "$P_POL" != "$S_POL" ]; then
      say "  DRIFT: fingerprints moved while this script performed no mutation"; POST_OK=0
    else say "  OK: fingerprints stable on the already-applied path"; fi
  fi
  say "[phaseC] REVIEW POST ACL=$P_ACL POLICY=$P_POL"
fi

say ""
if [ "$POST_OK" -eq 1 ] && [ "$CURRENT_STATE" = "NOT_APPLIED" ]; then
  say "PROMOTION_OUTCOME=APPLIED_AND_VERIFIED"
  say "Review ($REVIEW_REF) now carries 0128 exactly once, with the reviewed contract."
  exit 0
fi
if [ "$POST_OK" -eq 1 ] && [ "$CURRENT_STATE" = "APPLIED_AND_CONTRACT_PRESENT" ]; then
  say "PROMOTION_OUTCOME=ALREADY_APPLIED_EXACTLY_NO_MUTATION"
  say "Nothing was pushed. Review already carried 0128 with the reviewed contract."
  exit 0
fi

say "PROMOTION_OUTCOME=POST_VERIFICATION_FAILED"
say "State on Review is not the reviewed contract. Do not re-run this script."
evidence
exit 1
