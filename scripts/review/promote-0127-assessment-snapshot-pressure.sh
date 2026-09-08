#!/usr/bin/env bash
#
# Review promotion gate for migration 0127 — Assessment snapshot counts-only
# retention boundary.
#
#   bash scripts/review/promote-0127-assessment-snapshot-pressure.sh --local-pgtap-verified
#
# 0127 HAS ALREADY BEEN APPLIED TO CANONICAL REVIEW, EXACTLY ONCE. Running this
# again takes the APPLIED_AND_CONTRACT_PRESENT path and pushes nothing, but for
# routine checking use the read-only verifier instead — it has no code path to a
# mutation at all:
#
#   bash scripts/review/verify-0127-assessment-snapshot-pressure-post.sh
#
# WHY THIS IS A FILE AND NOT A PASTED BLOCK
#
# Two operator Terminal sessions were once killed by pasting a large runner into
# an interactive shell: pasted multi-line control flow can execute against the
# session itself. This script therefore runs as its OWN PROCESS. Never source it,
# never `. ` it, never eval it, never paste its body. Process-termination
# semantics are safe here precisely because the process is not your shell.
#
# ORDER OF OPERATIONS — measure before deciding
#
#   NOT_APPLIED                  -> identity -> TOCTOU -> CLI preflight ->
#                                   isolated dry-run -> exact pending proof ->
#                                   promote 0127 -> POST
#   APPLIED_AND_CONTRACT_PRESENT -> POST only, never db push
#   PARTIALLY_APPLIED            -> fail closed, never db push
#   UNDETERMINED                 -> fail closed, never db push
#
# THIS RUNS AFTER THE MERGE, AND THAT IS PINNED BY ANCESTRY, NOT BY A SHA
#
# The governance order is: push -> PR -> CI -> human review -> merge ->
# post-main CI -> promote. So Review must never receive 0127 before main has it.
#
# An earlier draft of this script enforced that by demanding
# `origin/main == <the SHA main had when the branch was cut>`. That is exactly
# backwards: it holds only BEFORE the merge and breaks the moment the merge
# lands — the script would refuse at precisely the moment it is meant to be
# used, and repairing it would need a second publication cycle for no reason.
#
# The correct proof is ancestry plus immutable content:
#
#   * `origin/main` is re-fetched here and HEAD must equal it, so the operator is
#     demonstrably standing on canonical main and not on a branch, a stale
#     checkout or a local experiment. Compared by SHA, so a detached HEAD at the
#     same commit is equally acceptable;
#   * the implementation commit must be an ANCESTOR of `origin/main`. Before the
#     merge that is false and this script refuses; after the merge it is true for
#     every future main, whatever the merge commit turns out to be. No future SHA
#     has to be predicted, and no follow-up commit is needed;
#   * the migration and its pgTAP must match pinned SHA256 content hashes. A
#     merge cannot change file content, so these survive it untouched — and they
#     are what the local pgTAP run actually validated.
#
# THE CIRCULARITY, AND HOW IT IS AVOIDED
#
# A tracked script cannot pin the commit that introduces it: the SHA does not
# exist until the commit is written, and writing it changes the SHA. So this
# script pins the IMPLEMENTATION commit — which does not contain this file, and
# is therefore nameable without circularity — and verifies ITSELF by content
# instead: the bytes being executed must equal the blob canonical main carries at
# this path. That answers "am I the reviewed runner?" without the file ever
# needing to know which commit added it. A locally edited runner mismatches and
# stops.
#
# TWO THINGS THAT DIFFER FROM THE 0126 RUNNER, DELIBERATELY
#
# 1. The local pgTAP gate is required, not assumed. `supabase db reset &&
#    supabase test db` is this repository's official database validation
#    (CLAUDE.md, docs/engineering/database-standards.md) and it is cheap and
#    fully reversible, unlike a Review promotion. It catches exactly the class of
#    error a hand-authored pgTAP fixture can carry — a wrong column, a missing
#    NOT NULL, an invariant that refuses the insert. This script refuses to run
#    without `--local-pgtap-verified`, which is the operator asserting that gate
#    passed on THIS migration content.
#
# 2. PRE baselines are measured, not pinned. The 0126 runner could hard-code ACL
#    and RLS fingerprints because a prior read had produced them. Nothing has
#    ever measured these three tables on Review, so inventing a constant would
#    fail closed for the wrong reason. Phase A captures the fingerprints and
#    Phase B and Phase C compare against what Phase A actually saw, which is what
#    detects drift during the window that matters.
#
# The secret is a bare database password in the macOS Keychain. It is read into
# an environment variable, never printed, never persisted, never placed in argv.

set -uo pipefail   # NOT -e: every failure is handled explicitly and fails closed.

# Content hashes survive a merge, so they are pinned. The commit below does NOT
# contain this file, which is what makes naming it non-circular.
APPROVED_MIGRATION_SHA="d2dabd5e6323c75bf6ac3d1c05fdf0db5a814628b0cef2ca73996e83e8d3e2ce"
APPROVED_PGTAP_SHA="c2ea2263985e410af3f0a61cacbafb49123225aeb3d46fe8cd22bd3ecfafed2e"
APPROVED_IMPLEMENTATION_COMMIT="0a642f2b0e015a25abe33ed4f87fd626ac5bd849"
RUNNER_PATH="scripts/review/promote-0127-assessment-snapshot-pressure.sh"

MIGRATION_FILE="supabase/migrations/0127_create_assessment_snapshot_retention_pressure_boundary.sql"
MIGRATION_BASENAME="0127_create_assessment_snapshot_retention_pressure_boundary.sql"
PGTAP_FILE="supabase/tests/assessment_snapshot_retention_pressure_boundary.test.sql"

REVIEW_REF="rwfvxvbzaosgcyfxdjpt"
DB_HOST="db.${REVIEW_REF}.supabase.co"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"

KEYCHAIN_SERVICE="evol-os-review-db"

LOG=$(mktemp -t evol0127log.XXXXXX)
SNAP=$(mktemp -t evol0127snap.XXXXXX)
STATE=$(mktemp -t evol0127state.XXXXXX)
DRY=$(mktemp -t evol0127dry.XXXXXX)
T1=$(mktemp -t evol0127toctou.XXXXXX)
T2=$(mktemp -t evol0127post.XXXXXX)
T3=$(mktemp -t evol0127contract.XXXXXX)
HELP=$(mktemp -t evol0127help.XXXXXX)
PUSHLOG=$(mktemp -t evol0127push.XXXXXX)

APPLIED=no
say() { printf '%s\n' "$*"; }
evidence() { say "Evidence: LOG=$LOG STATE=$STATE TOCTOU=$T1 POST=$T2 CONTRACT=$T3 DRY=$DRY PUSH=$PUSHLOG"; }

say "[0127] evidence log -> $LOG"

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
  say "          supabase db reset"
  say "          supabase test db"
  say "      Both must pass, and the run must include $PGTAP_FILE."
  say "      Then re-run this script with --local-pgtap-verified."
  say "PROMOTION_OUTCOME=NO_MUTATION_LOCAL_GATE_NOT_ASSERTED"
  exit 1
fi
say "[0127] local pgTAP gate asserted by operator"

# --------------------------------------------------------------------------
# repo + identity
# --------------------------------------------------------------------------
REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT" || { say "STOP: cannot reach repository root"; exit 1; }
say "[0127] repo: $REPO_ROOT"

# Refresh the remote-tracking ref first: every judgement below is about
# canonical main, and a stale ref would answer about yesterday's main.
if ! git fetch --no-tags origin main >>"$LOG" 2>&1; then
  say "STOP: could not fetch origin/main — refusing to judge canonical state from a stale ref"; exit 1
fi

HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
ORIGIN_SHA=$(git rev-parse origin/main 2>/dev/null)
MIG_SHA=$(shasum -a 256 "$MIGRATION_FILE" 2>/dev/null | cut -d' ' -f1)
TAP_SHA=$(shasum -a 256 "$PGTAP_FILE" 2>/dev/null | cut -d' ' -f1)
RUN_SHA=$(shasum -a 256 "$REPO_ROOT/$RUNNER_PATH" 2>/dev/null | cut -d' ' -f1)
MIG_CANON=$(git show "origin/main:$MIGRATION_FILE" 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
TAP_CANON=$(git show "origin/main:$PGTAP_FILE" 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
RUN_CANON=$(git show "origin/main:$RUNNER_PATH" 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
DIRTY=$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')

if [ "$DIRTY" != "0" ]; then
  say "STOP: tracked worktree is not clean ($DIRTY change(s)) — refusing to promote an unrecorded file"; exit 1
fi

# Standing on canonical main. Compared by SHA rather than by branch name, so a
# detached checkout of the same commit is equally acceptable and a feature
# branch never is.
if [ -z "$ORIGIN_SHA" ]; then
  say "STOP: origin/main could not be resolved"; exit 1
fi
if [ "$HEAD_SHA" != "$ORIGIN_SHA" ]; then
  say "STOP: HEAD is $HEAD_SHA but origin/main is $ORIGIN_SHA."
  say "      Promotion runs from canonical main only. Check out main and pull first."
  exit 1
fi

# The slice is actually IN main. False before the merge, true for every main
# after it — which is what removes the need to predict the merge SHA.
if ! git merge-base --is-ancestor "$APPROVED_IMPLEMENTATION_COMMIT" origin/main 2>/dev/null; then
  say "STOP: $APPROVED_IMPLEMENTATION_COMMIT is not an ancestor of origin/main."
  say "      0127 has not been merged yet. Review must never receive a migration"
  say "      that main does not already have."
  exit 1
fi

if [ "$MIG_SHA" != "$APPROVED_MIGRATION_SHA" ]; then
  say "STOP: migration sha is $MIG_SHA, approved is $APPROVED_MIGRATION_SHA"; exit 1
fi
if [ "$TAP_SHA" != "$APPROVED_PGTAP_SHA" ]; then
  say "STOP: pgTAP sha is $TAP_SHA, approved is $APPROVED_PGTAP_SHA"; exit 1
fi
if [ "$MIG_SHA" != "$MIG_CANON" ] || [ "$TAP_SHA" != "$TAP_CANON" ]; then
  say "STOP: working tree differs from origin/main for the migration or its pgTAP"; exit 1
fi

# Self-check by content, never by commit SHA — see the circularity note above.
if [ -z "$RUN_CANON" ]; then
  say "STOP: $RUNNER_PATH is not present in origin/main"; exit 1
fi
if [ "$RUN_SHA" != "$RUN_CANON" ]; then
  say "STOP: the runner being executed is not the version canonical main carries."
  say "      running=$RUN_SHA canonical=$RUN_CANON"
  exit 1
fi

say "[0127] identity OK  head=$HEAD_SHA (== origin/main)  branch=$BRANCH"
say "[0127] $APPROVED_IMPLEMENTATION_COMMIT is an ancestor of origin/main — 0127 is merged"
say "[0127] migration, pgTAP and runner content all match canonical main"

# --------------------------------------------------------------------------
# credential
# --------------------------------------------------------------------------
DB_PASSWORD="$(security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$USER" -w 2>/dev/null)"
if [ -z "${DB_PASSWORD:-}" ]; then
  say "STOP: keychain credential not found (service=$KEYCHAIN_SERVICE account=$USER)"; exit 1
fi
export PGPASSWORD="$DB_PASSWORD"
say "[0127] credential loaded (never printed); host=$DB_HOST"

runsql() {   # runsql <output-file> <sql-file>
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
       -v ON_ERROR_STOP=1 --no-psqlrc -At </dev/null -f "$2" >"$1" 2>>"$LOG"
}

# --------------------------------------------------------------------------
# CANONICAL SNAPSHOT — one definition, executed by PRE, TOCTOU and POST.
# Never re-expressed anywhere else, so the three phases cannot drift apart.
# --------------------------------------------------------------------------
cat >"$SNAP" <<'CANON'
select 'PROJECT_REF=' || coalesce(current_setting('app.settings.project_ref', true), '<unset>');
select 'DB_IDENTITY=' || current_database() || '@' || inet_server_addr()::text;
select 'SERVICE_ROLE_DIRECT_SELECT=' || string_agg(t||'='||has_table_privilege('service_role','public.'||t,'select')::text,' ' order by t)
  from unnest(array['assessment_execution_snapshots','assessment_execution_snapshot_sections',
                    'assessment_execution_snapshot_questions']) t;
select 'OTHER_ROLE_DIRECT_SELECT=' || string_agg(r||':'||t||'='||has_table_privilege(r,'public.'||t,'select')::text,' ' order by r,t)
  from unnest(array['anon','authenticated','public']) r,
       unnest(array['assessment_execution_snapshots','assessment_execution_snapshot_sections',
                    'assessment_execution_snapshot_questions']) t;
select 'ACL_FINGERPRINT=' || md5(string_agg(
         c.relname || '::' || coalesce(
           (select string_agg(x, ',' order by x) from unnest(c.relacl::text[]) x), '<default>'),
         '|' order by c.relname))
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in
   ('assessment_execution_snapshots','assessment_execution_snapshot_sections',
    'assessment_execution_snapshot_questions');
select 'RLS_FINGERPRINT=' || md5(string_agg(
         c.relname || '::' || c.relrowsecurity::text || ':' || c.relforcerowsecurity::text,
         '|' order by c.relname))
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in
   ('assessment_execution_snapshots','assessment_execution_snapshot_sections',
    'assessment_execution_snapshot_questions');
select 'RLS_ENABLED_COUNT=' || count(*)::text
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
   and c.relname in ('assessment_execution_snapshots','assessment_execution_snapshot_sections',
                     'assessment_execution_snapshot_questions') and c.relrowsecurity;
select 'POLICY_FINGERPRINT=' || coalesce(md5(string_agg(
         tablename || '::' || policyname || '::' || permissive || '::' ||
         array_to_string(roles, ',') || '::' || cmd || '::' ||
         coalesce(qual,'') || '::' || coalesce(with_check,''),
         '|' order by tablename, policyname)), '<none>')
  from pg_policies where schemaname='public' and tablename in
   ('assessment_execution_snapshots','assessment_execution_snapshot_sections',
    'assessment_execution_snapshot_questions');
select 'COLUMN_CONTRACT=' || string_agg(table_name||'.'||column_name, ' ' order by table_name)
  from information_schema.columns
 where table_schema='public' and column_name='company_id'
   and table_name in ('assessment_execution_snapshots','assessment_execution_snapshot_sections',
                      'assessment_execution_snapshot_questions');
select 'RPC_NAMECOUNT=' || count(*)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='get_company_assessment_snapshot_pressure_v1';
select 'RPC_EXACT_SIGNATURE_PRESENT=' || (to_regprocedure('public.get_company_assessment_snapshot_pressure_v1(uuid)') is not null)::int::text;
-- Overloads ONLY. The canonical signature is excluded by oid: an earlier
-- revision aggregated every function of that name, so once 0127 was applied it
-- reported the approved signature back as if it were an unexpected overload.
select 'RPC_ALTERNATE_SIGNATURES=' || coalesce(string_agg(pg_get_function_identity_arguments(p.oid),' | ' order by p.oid),'(none)')
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='get_company_assessment_snapshot_pressure_v1'
   and p.oid is distinct from to_regprocedure('public.get_company_assessment_snapshot_pressure_v1(uuid)');
select 'COMPANION_0126_NAMECOUNT=' || count(*)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='get_company_retention_pressure_v1';
select 'COMPANION_0126_SIGNATURE_PRESENT=' || (to_regprocedure('public.get_company_retention_pressure_v1(uuid)') is not null)::int::text;
select 'COMPANION_0126_EXECUTE=' ||
  'anon=' || has_function_privilege('anon','public.get_company_retention_pressure_v1(uuid)','execute')::text ||
  ' authenticated=' || has_function_privilege('authenticated','public.get_company_retention_pressure_v1(uuid)','execute')::text ||
  ' service_role=' || has_function_privilege('service_role','public.get_company_retention_pressure_v1(uuid)','execute')::text;
select 'MIGRATION_0126_PRESENT=' || (exists(select 1 from supabase_migrations.schema_migrations where version like '0126%'))::text;
select 'MIGRATION_0127_PRESENT=' || (exists(select 1 from supabase_migrations.schema_migrations where version like '0127%'))::text;
select 'MIGRATION_0127_COUNT=' || (select count(*)::text from supabase_migrations.schema_migrations where version like '0127%');
select 'MIGRATION_HISTORY_TAIL=' || string_agg(version,',' order by version)
  from (select version from supabase_migrations.schema_migrations order by version desc limit 6) t;
CANON

val() { grep "^$1=" "$2" | head -1 | cut -d= -f2-; }

# --------------------------------------------------------------------------
# PHASE A — READ-ONLY CURRENT-STATE RECOVERY, BEFORE ANY DECISION
# --------------------------------------------------------------------------
say "[phaseA] recovering current Review state (read-only)"
if ! runsql "$STATE" "$SNAP"; then
  say "STOP: could not read Review state; see $LOG"; evidence; exit 1
fi
sed 's/^/    /' "$STATE"

S_M127=$(val MIGRATION_0127_PRESENT "$STATE")
S_M127N=$(val MIGRATION_0127_COUNT "$STATE")
S_M126=$(val MIGRATION_0126_PRESENT "$STATE")
S_NAME=$(val RPC_NAMECOUNT "$STATE")
S_EXACT=$(val RPC_EXACT_SIGNATURE_PRESENT "$STATE")
S_ALT=$(val RPC_ALTERNATE_SIGNATURES "$STATE")
S_SRSEL=$(val SERVICE_ROLE_DIRECT_SELECT "$STATE")
S_OTHER=$(val OTHER_ROLE_DIRECT_SELECT "$STATE")
S_ACL=$(val ACL_FINGERPRINT "$STATE")
S_RLS=$(val RLS_FINGERPRINT "$STATE")
S_RLSN=$(val RLS_ENABLED_COUNT "$STATE")
S_POL=$(val POLICY_FINGERPRINT "$STATE")
S_COLS=$(val COLUMN_CONTRACT "$STATE")
S_C126N=$(val COMPANION_0126_NAMECOUNT "$STATE")
S_C126S=$(val COMPANION_0126_SIGNATURE_PRESENT "$STATE")

# Facts that can be asserted a priori, from the migrations rather than from a
# previous measurement: 0114 revoked SELECT from every role, RLS is enabled on
# all three, each carries company_id, and 0126 is already promoted.
EXPECTED_SRSEL="assessment_execution_snapshot_questions=false assessment_execution_snapshot_sections=false assessment_execution_snapshots=false"
EXPECTED_COLS="assessment_execution_snapshot_questions.company_id assessment_execution_snapshot_sections.company_id assessment_execution_snapshots.company_id"

BASELINE_OK=yes
if [ "$S_SRSEL" != "$EXPECTED_SRSEL" ]; then
  say "  BASELINE: service_role SELECT is [$S_SRSEL], expected [$EXPECTED_SRSEL]"; BASELINE_OK=no
fi
if printf '%s' "$S_OTHER" | grep -q '=true'; then
  say "  BASELINE: a non-service role can already SELECT a snapshot table [$S_OTHER]"; BASELINE_OK=no
fi
if [ "$S_RLSN" != "3" ]; then
  say "  BASELINE: RLS enabled on $S_RLSN of 3 snapshot tables"; BASELINE_OK=no
fi
if [ "$S_COLS" != "$EXPECTED_COLS" ]; then
  say "  BASELINE: company_id column contract is [$S_COLS]"; BASELINE_OK=no
fi
if [ "$S_M126" != "true" ] || [ "$S_C126N" != "1" ] || [ "$S_C126S" != "1" ]; then
  say "  BASELINE: the 0126 companion is not in its expected state"; BASELINE_OK=no
fi

CURRENT_STATE=UNDETERMINED
if [ "$S_M127" = "false" ] && [ "$S_NAME" = "0" ] && [ "$S_EXACT" = "0" ] && \
   [ "$S_ALT" = "(none)" ] && [ "$BASELINE_OK" = yes ]; then
  CURRENT_STATE=NOT_APPLIED
elif [ "$S_M127" = "true" ] && [ "$S_M127N" = "1" ] && [ "$S_NAME" = "1" ] && \
     [ "$S_EXACT" = "1" ] && [ "$S_ALT" = "(none)" ] && [ "$BASELINE_OK" = yes ]; then
  CURRENT_STATE=APPLIED_AND_CONTRACT_PRESENT
elif [ "$S_M127" = "true" ] || [ "$S_NAME" != "0" ] || [ "$BASELINE_OK" = no ]; then
  CURRENT_STATE=PARTIALLY_APPLIED
fi
say "[phaseA] REVIEW_0127_CURRENT_STATE=$CURRENT_STATE"

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
    say "STOP: TOCTOU query failed"; evidence; exit 1
  fi
  DRIFT=0
  for pair in \
    "MIGRATION_0126_PRESENT=true" \
    "MIGRATION_0127_PRESENT=false" \
    "RPC_NAMECOUNT=0" \
    "RPC_EXACT_SIGNATURE_PRESENT=0" \
    "RPC_ALTERNATE_SIGNATURES=(none)" \
    "SERVICE_ROLE_DIRECT_SELECT=$S_SRSEL" \
    "OTHER_ROLE_DIRECT_SELECT=$S_OTHER" \
    "ACL_FINGERPRINT=$S_ACL" \
    "RLS_FINGERPRINT=$S_RLS" \
    "POLICY_FINGERPRINT=$S_POL" \
    "COLUMN_CONTRACT=$S_COLS" \
    "COMPANION_0126_SIGNATURE_PRESENT=1"
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
  if ! grep -q -- '--linked' "$HELP"; then
    say "STOP: CLI lacks --linked"; evidence; exit 1
  fi
  if ! grep -q -- '--dry-run' "$HELP"; then
    say "STOP: CLI lacks --dry-run"; evidence; exit 1
  fi
  if grep -q -- '--yes' "$HELP"; then
    YES_FLAG="--yes"
  elif grep -qE '^[[:space:]]*-y,' "$HELP"; then
    YES_FLAG="-y"
  else
    say "STOP: CLI has no verified non-interactive confirmation flag"; evidence; exit 1
  fi
  say "[phaseB] CLI flags verified: --linked --dry-run $YES_FLAG"

  export SUPABASE_DB_PASSWORD="$DB_PASSWORD"

  # Dry-run writes to its OWN file. The pending set is derived from that file
  # alone, never from the shared log.
  if ! supabase db push --linked --dry-run </dev/null >"$DRY" 2>&1; then
    say "STOP: dry-run failed"; tail -20 "$DRY"; cat "$DRY" >>"$LOG"; evidence; exit 1
  fi
  cat "$DRY" >>"$LOG"
  sed 's/^/    /' "$DRY" | tail -20
  PEND=$(grep -oE '0[0-9]{3}_[a-z0-9_]+\.sql' "$DRY" | sort -u | tr '\n' ' ' | sed 's/ $//')
  say "[phaseB] PENDING_SET (from dedicated dry-run file only): ${PEND:-<none>}"
  if [ "$PEND" != "$MIGRATION_BASENAME" ]; then
    say "STOP: pending set is not exactly 0127. NO MUTATION PERFORMED."
    say "PROMOTION_OUTCOME=NO_MUTATION"; evidence; exit 1
  fi

  say "[phaseB] applying migration 0127"
  supabase db push --linked $YES_FLAG </dev/null >"$PUSHLOG" 2>&1
  RC=$?
  cat "$PUSHLOG" >>"$LOG"; tail -15 "$PUSHLOG"
  if [ "$RC" -ne 0 ]; then
    # The push may have partially succeeded. This is UNKNOWN, not FAILED, and an
    # automatic retry could apply a migration twice or on top of a half state.
    say "STOP: db push returned $RC. Outcome is UNKNOWN, not failed."
    say "      Do NOT re-run this script. Do NOT roll back. Do NOT repair."
    say "      Inspect first: re-read Review state and decide with a human."
    say "PROMOTION_OUTCOME=PUSH_UNKNOWN"; evidence; exit 1
  fi
  APPLIED=yes
  say "[phaseB] PROMOTION_EXECUTED=YES MIGRATIONS_APPLIED=0127"
fi

# --------------------------------------------------------------------------
# PHASE C — POST verification (fresh promotion AND already-applied)
# --------------------------------------------------------------------------
say "[phaseC] POST verification"
POST_OK=1
if ! runsql "$T2" "$SNAP"; then
  say "  POST snapshot unreadable"; POST_OK=0
else
  sed 's/^/    /' "$T2"
fi

if [ "$POST_OK" -eq 1 ]; then
  cat >"$T3.sql" <<'CONTRACT'
-- `provolatile` is "char", which has no unambiguous || with text. Without the
-- explicit cast Postgres raises 'operator is not unique: text || "char"' and
-- ON_ERROR_STOP aborts the whole POST file — which is how this defect surfaced.
select 'SECURITY_DEFINER_POST=' || p.prosecdef::text || ' VOLATILITY=' || p.provolatile::text
  from pg_proc p where p.oid='public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;
select 'SEARCH_PATH_SAFE_POST=' || (select (count(*)=1)::text from unnest(p.proconfig) cfg
   where cfg like 'search_path=%' and btrim(split_part(cfg,'=',2),'"')='')
  from pg_proc p where p.oid='public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;
select 'OWNER_POST=' || pg_get_userbyid(p.proowner)
  from pg_proc p where p.oid='public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;
select 'RETURN_COLUMNS_POST=' || array_to_string(p.proargnames, ',')
  from pg_proc p where p.oid='public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;
select 'RETURN_TYPES_POST=' || (select string_agg(format_type(t, null), ',' order by o)
   from unnest(p.proallargtypes) with ordinality x(t, o))
  from pg_proc p where p.oid='public.get_company_assessment_snapshot_pressure_v1(uuid)'::regprocedure;
select 'ANON_EXECUTE_POST='          || has_function_privilege('anon','public.get_company_assessment_snapshot_pressure_v1(uuid)','execute')::text;
select 'AUTHENTICATED_EXECUTE_POST=' || has_function_privilege('authenticated','public.get_company_assessment_snapshot_pressure_v1(uuid)','execute')::text;
select 'SERVICE_ROLE_EXECUTE_POST='  || has_function_privilege('service_role','public.get_company_assessment_snapshot_pressure_v1(uuid)','execute')::text;
select 'PUBLIC_EXECUTE_POST='        || has_function_privilege('public','public.get_company_assessment_snapshot_pressure_v1(uuid)','execute')::text;
begin;
set local role service_role;
select 'FUNCTIONAL_BOUNDARY_POST=rows=' || count(*)::text
  from public.get_company_assessment_snapshot_pressure_v1(gen_random_uuid());
select 'UNKNOWN_TENANT_TOTAL_POST=' ||
  (select coalesce(sum(row_count),0)::bigint from public.get_company_assessment_snapshot_pressure_v1(gen_random_uuid()))::text ||
  ' rows=' || (select count(*) from public.get_company_assessment_snapshot_pressure_v1(gen_random_uuid()))::text;
select 'NULL_TENANT_TOTAL_POST=' ||
  (select coalesce(sum(row_count),0)::bigint from public.get_company_assessment_snapshot_pressure_v1(null))::text ||
  ' rows=' || (select count(*) from public.get_company_assessment_snapshot_pressure_v1(null))::text;
select 'RELATION_NAMES_POST=' || (select string_agg(relation_name, ',' order by relation_name)
   from public.get_company_assessment_snapshot_pressure_v1(gen_random_uuid()));
select 'COMPANION_0126_ROWS_POST=' || (select count(*)::text
   from public.get_company_retention_pressure_v1(gen_random_uuid()));
rollback;
CONTRACT
  if ! runsql "$T3" "$T3.sql"; then
    say "  POST contract query unreadable"; POST_OK=0
  else
    sed 's/^/    /' "$T3"
  fi
fi

if [ "$POST_OK" -eq 1 ]; then
  # The security baseline must be byte-identical to what phase A measured. The
  # whole claim of this migration is that it changed nothing except adding one
  # function.
  for chk in "SERVICE_ROLE_DIRECT_SELECT=$S_SRSEL" "OTHER_ROLE_DIRECT_SELECT=$S_OTHER" \
             "ACL_FINGERPRINT=$S_ACL" "RLS_FINGERPRINT=$S_RLS" \
             "POLICY_FINGERPRINT=$S_POL" "COLUMN_CONTRACT=$S_COLS"; do
    if grep -Fxq "$chk" "$T2"; then say "  ${chk%%=*}: UNCHANGED"
    else say "  ${chk%%=*}: DRIFT"; POST_OK=0; fi
  done
  for want in "MIGRATION_0126_PRESENT=true" "MIGRATION_0127_PRESENT=true" \
              "MIGRATION_0127_COUNT=1" "RPC_NAMECOUNT=1" \
              "RPC_EXACT_SIGNATURE_PRESENT=1" "RPC_ALTERNATE_SIGNATURES=(none)" \
              "RLS_ENABLED_COUNT=3" "COMPANION_0126_NAMECOUNT=1" \
              "COMPANION_0126_SIGNATURE_PRESENT=1" \
              "COMPANION_0126_EXECUTE=anon=false authenticated=false service_role=true"; do
    if ! grep -Fxq "$want" "$T2"; then say "  MISSING: [$want]"; POST_OK=0; fi
  done
  for want in "SECURITY_DEFINER_POST=true VOLATILITY=s" "SEARCH_PATH_SAFE_POST=true" \
              "RETURN_COLUMNS_POST=p_company_id,relation_name,row_count" \
              "RETURN_TYPES_POST=uuid,text,bigint" \
              "ANON_EXECUTE_POST=false" "AUTHENTICATED_EXECUTE_POST=false" \
              "PUBLIC_EXECUTE_POST=false" "SERVICE_ROLE_EXECUTE_POST=true" \
              "FUNCTIONAL_BOUNDARY_POST=rows=3" \
              "UNKNOWN_TENANT_TOTAL_POST=0 rows=3" \
              "NULL_TENANT_TOTAL_POST=0 rows=3" \
              "RELATION_NAMES_POST=assessment_execution_snapshot_questions,assessment_execution_snapshot_sections,assessment_execution_snapshots" \
              "COMPANION_0126_ROWS_POST=4"; do
    if ! grep -Fxq "$want" "$T3"; then say "  MISSING: [$want]"; POST_OK=0; fi
  done
fi

# --------------------------------------------------------------------------
# verdict
# --------------------------------------------------------------------------
if [ "$POST_OK" -eq 1 ] && [ "$APPLIED" = yes ]; then
  say "POST_VERDICT=PASS"
  say "PROMOTION_OUTCOME=APPLIED_AND_VERIFIED"
  say "MIGRATIONS_APPLIED=0127"
  say "NEXT: run the pgTAP suite against Review or local, then close the runtime gate."
  evidence
  exit 0
fi
if [ "$POST_OK" -eq 1 ]; then
  say "POST_VERDICT=PASS"
  say "PROMOTION_OUTCOME=ALREADY_APPLIED_AND_VERIFIED"
  say "MIGRATIONS_APPLIED=none (0127 was already present)"
  evidence
  exit 0
fi
if [ "$APPLIED" = yes ]; then
  say "POST_VERDICT=FAIL"
  say "PROMOTION_OUTCOME=MUTATION_APPLIED_POST_FAILED"
  say "Do NOT roll back. Do NOT re-run db push. Do NOT auto-repair."
else
  say "POST_VERDICT=FAIL"
  say "PROMOTION_OUTCOME=NO_MUTATION_POST_FAILED"
fi
evidence
exit 1
