#!/usr/bin/env bash
#
# F-DB1d local gate — 0146 over real local PostgreSQL.
#
# Same shape as the F-DB1c runner: PRE snapshot through 0145, apply, compare
# fingerprints, prove drift rejection and integral rollback, run pgTAP, then the
# isolated PostgREST proof. Foundation offenders must move 30 -> 24 and nothing
# else may move.
set -uo pipefail
say(){ printf '%s\n' "$*"; }
stop(){ say "STOP: $*"; exit 1; }
classify_reset_failure(){
  local reset_log=$1 reset_rc=$2 reset_label=$3 unhealthy_line service
  unhealthy_line=$(grep -E '^[^[:space:]]+ container is not ready: unhealthy$' "$reset_log" | tail -1 || true)
  if [ -n "$unhealthy_line" ]; then
    service=$(printf '%s\n' "$unhealthy_line" | sed -E 's/^([^[:space:]]+) container is not ready: unhealthy$/\1/')
    say FAILURE_CLASS=ENVIRONMENTAL
    say "RESET_SERVICE=$service"
  else
    say FAILURE_CLASS=FAIL
  fi
  say "RESET_EXIT_CODE=$reset_rc"
  say "RESET_LOG=$reset_log"
  stop "$reset_label reset failed"
}
run_reset(){
  local reset_workdir=$1 reset_log=$2 reset_label=$3 reset_rc
  supabase db reset --workdir "$reset_workdir">"$reset_log" 2>&1
  reset_rc=$?
  [ "$reset_rc" -eq 0 ] || classify_reset_failure "$reset_log" "$reset_rc" "$reset_label"
}

# Regression tests exercise the production classifier with synthetic logs. This
# mode performs no tool discovery, Supabase command, Docker call or DB access.
if [ -n "${F_DB1D_RESET_CLASSIFY_SELFTEST_LOG:-}" ]; then
  case "${F_DB1D_RESET_CLASSIFY_SELFTEST_RC:-}" in
    ''|*[!0-9]*|0) stop "invalid reset classifier self-test exit code" ;;
  esac
  [ -f "$F_DB1D_RESET_CLASSIFY_SELFTEST_LOG" ] || stop "reset classifier self-test log missing"
  classify_reset_failure \
    "$F_DB1D_RESET_CLASSIFY_SELFTEST_LOG" \
    "$F_DB1D_RESET_CLASSIFY_SELFTEST_RC" \
    "${F_DB1D_RESET_CLASSIFY_SELFTEST_LABEL:-rollback}"
fi
ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1
cd "$ROOT" || exit 1

MIGRATION=supabase/migrations/0146_harden_feedback_attachment_mention_tenant_fks.sql
TEST=supabase/tests/feedback_attachment_mention_tenant_composite_fks.test.sql
EXPECTED_SHA=684501087acd717f55eed8b83911457f899ce7802217ed37dfe54d6a33ab0d65
for tool in supabase psql git tar shasum; do command -v "$tool" >/dev/null || stop "$tool unavailable"; done
[ "$(shasum -a 256 "$MIGRATION"|cut -d' ' -f1)" = "$EXPECTED_SHA" ] || stop "migration 0146 hash mismatch"

DB_URL=$(supabase status -o env 2>/dev/null|sed -nE 's/^DB_URL="?([^"]*)"?$/\1/p'|tail -1)
[ -n "$DB_URL" ] || DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
HOST=$(printf '%s' "$DB_URL"|sed -nE 's#^[a-z+]+://[^@]*@([^:/]+).*#\1#p')
case "$HOST" in localhost|127.0.0.1|::1|'[::1]') :;; *) stop "TARGET_PROVEN_LOCAL=NO";; esac
case "$DB_URL" in *supabase.co*|*supabase.com*) stop "TARGET_PROVEN_LOCAL=NO";; esac
say TARGET_PROVEN_LOCAL=YES

WORK=$(mktemp -d -t fdb1d0146.XXXXXX); PRE="$WORK/pre"; POST="$WORK/post"; mkdir -p "$PRE" "$POST"
git archive HEAD|tar -x -C "$PRE" || stop "cannot create PRE snapshot"
git archive HEAD|tar -x -C "$POST" || stop "cannot create POST snapshot"
# The PRE tree must NOT contain 0146: the baseline it measures is the schema
# through 0145. The POST tree gets the migration and its suite.
rm -f "$PRE/$MIGRATION" "$PRE/$TEST"
cp "$MIGRATION" "$POST/$MIGRATION"; cp "$TEST" "$POST/$TEST"
psql_local(){ psql "$DB_URL" -v ON_ERROR_STOP=1 --no-psqlrc "$@"; }
fp(){ psql "$DB_URL" -At --no-psqlrc -v ON_ERROR_STOP=1 -c "$1"; }
offenders(){ psql "$DB_URL" --no-psqlrc -f supabase/gates/adr_0012_tenant_owned_fk_sweep.sql 2>&1|grep -oE "offenders: [^']*"|head -1|sed 's/^offenders: //'|awk -F', ' '{print NF}'; }
security_fp(){ fp "select md5(string_agg(x,E'\\n' order by x)) from (select 'rls|'||c.relname::text||'|'||c.relrowsecurity::text||'|'||c.relforcerowsecurity::text x from pg_class c where c.oid in ('public.feedback_attachments'::regclass,'public.feedback_mentions'::regclass,'public.feedback_threads'::regclass,'public.feedback_messages'::regclass,'public.people'::regclass) union all select 'policy|'||c.relname::text||'|'||p.polname::text||'|'||p.polcmd::text||'|'||coalesce(pg_get_expr(p.polqual,p.polrelid),'')||'|'||coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') from pg_policy p join pg_class c on c.oid=p.polrelid where c.oid in ('public.feedback_attachments'::regclass,'public.feedback_mentions'::regclass,'public.feedback_threads'::regclass,'public.feedback_messages'::regclass,'public.people'::regclass) union all select 'acl|'||c.relname::text||'|'||coalesce(c.relacl::text,'') from pg_class c where c.oid in ('public.feedback_attachments'::regclass,'public.feedback_mentions'::regclass,'public.feedback_threads'::regclass,'public.feedback_messages'::regclass,'public.people'::regclass)) q;"; }
# Every FK in public EXCEPT the six this slice replaces. If anything else moved,
# this fingerprint changes and the gate stops.
other_fk_fp(){ fp "select md5(string_agg(conname||'|'||pg_get_constraintdef(oid,true),E'\\n' order by conrelid::regclass::text,conname)) from pg_constraint where contype='f' and connamespace='public'::regnamespace and conname not in ('feedback_attachments_thread_id_fkey','feedback_attachments_message_id_fkey','feedback_attachments_uploaded_by_employee_id_fkey','feedback_mentions_thread_id_fkey','feedback_mentions_message_id_fkey','feedback_mentions_mentioned_employee_id_fkey');"; }

say '[f-db1d] 1/6 PRE through 0145'
run_reset "$PRE" "$WORK/pre-reset.log" PRE
PRE_SECURITY=$(security_fp) || stop "PRE security fingerprint failed"
PRE_OTHER=$(other_fk_fp) || stop "PRE other-FK fingerprint failed"
PRE_OFFENDERS=$(offenders) || stop "PRE offender census failed"
[ -n "$PRE_SECURITY" ] && [ -n "$PRE_OTHER" ] || stop "PRE fingerprint empty"
[ "$PRE_OFFENDERS" = 30 ] || stop "PRE offenders=$PRE_OFFENDERS"
say "PRE_FOUNDATION_OFFENDERS=$PRE_OFFENDERS"

say '[f-db1d] 2/6 apply 0146 and fingerprints'
psql_local -f "$MIGRATION">"$WORK/apply.log" 2>&1 || { tail -40 "$WORK/apply.log"; stop "0146 apply failed"; }
POST_SECURITY=$(security_fp) || stop "POST security fingerprint failed"
POST_OTHER=$(other_fk_fp) || stop "POST other-FK fingerprint failed"
POST_OFFENDERS=$(offenders) || stop "POST offender census failed"
[ -n "$POST_SECURITY" ] && [ -n "$POST_OTHER" ] || stop "POST fingerprint empty"
[ "$PRE_SECURITY" = "$POST_SECURITY" ] || stop "SECURITY_FINGERPRINT=FAIL"
[ "$PRE_OTHER" = "$POST_OTHER" ] || stop "OTHER_FK_FINGERPRINT=FAIL"
[ "$POST_OFFENDERS" = 24 ] || stop "POST offenders=$POST_OFFENDERS"
say SECURITY_FINGERPRINT=PASS; say OTHER_FK_FINGERPRINT=PASS; say "POST_FOUNDATION_OFFENDERS=$POST_OFFENDERS"

say '[f-db1d] 3/6 the SET NULL clause nulls only the uploader'
# This is the defect this migration exists to avoid: a plain `on delete set null`
# on the composite key would try to null company_id, which is NOT NULL.
[ "$(fp "select count(*) from pg_constraint where conname='feedback_attachments_uploaded_by_employee_id_fkey' and pg_get_constraintdef(oid) like '%ON DELETE SET NULL (uploaded_by_employee_id)%';")" = 1 ] \
  || stop "SET_NULL_COLUMN_LIST=FAIL"
[ "$(fp "select count(*) from pg_attribute a join pg_class c on c.oid=a.attrelid and c.relnamespace='public'::regnamespace where c.relname in ('feedback_attachments','feedback_mentions') and a.attname='company_id' and a.attnotnull;")" = 2 ] \
  || stop "COMPANY_ID_NOT_NULL=FAIL"
say SET_NULL_COLUMN_LIST=PASS

say '[f-db1d] 4/6 drift rejection'
run_reset "$PRE" "$WORK/drift-reset.log" drift
psql_local -c 'alter table public.feedback_mentions rename constraint feedback_mentions_thread_id_fkey to feedback_mentions_thread_id_fkey_drift;' >/dev/null
psql_local -f "$MIGRATION">"$WORK/drift.log" 2>&1; RC=$?
[ "$RC" -ne 0 ] && grep -q FEEDBACK_CHILD_TENANT_FK_PREFLIGHT_FAILED "$WORK/drift.log" || stop "DRIFT_REJECTION=FAIL"
[ "$(fp "select count(*) from pg_constraint where conname like '%_company_fkey_new';")" = 0 ] || stop "DRIFT_BEFORE_DDL=FAIL"
say DRIFT_REJECTION=PASS

say '[f-db1d] 5/6 rollback after intermediate failure'
run_reset "$PRE" "$WORK/rollback-reset.log" rollback
psql_local -c 'alter table public.feedback_mentions add constraint feedback_mentions_mentioned_employee_company_fkey_new check (true);' >/dev/null
psql_local -f "$MIGRATION">"$WORK/rollback.log" 2>&1; RC=$?
[ "$RC" -ne 0 ] || stop "INTERMEDIATE_FAILURE=FAIL"
[ "$(fp "select count(*) from pg_constraint where conname='feedback_attachments_thread_company_fkey_new';")" = 0 ] || stop "ROLLBACK_INTEGRAL=FAIL"
[ "$(fp "select array_length(conkey,1) from pg_constraint where conname='feedback_attachments_thread_id_fkey';")" = 1 ] || stop "ROLLBACK_INTEGRAL=FAIL"
[ "$(fp "select confdeltype from pg_constraint where conname='feedback_attachments_uploaded_by_employee_id_fkey';")" = n ] || stop "ROLLBACK_INTEGRAL=FAIL"
say ROLLBACK_INTEGRAL=PASS

say '[f-db1d] 6/6 pgTAP, full suite and isolated PostgREST'
run_reset "$POST" "$WORK/post-reset.log" POST
supabase test db --workdir "$POST" "$TEST">"$WORK/focused.log" 2>&1 || { tail -80 "$WORK/focused.log"; stop "focused pgTAP failed"; }
supabase test db --workdir "$POST">"$WORK/full.log" 2>&1 || { tail -80 "$WORK/full.log"; stop "full DB suite failed"; }
say FOCUSED_PGTAP=PASS; say FULL_DB_SUITE=PASS
F_DB1C_MODE=f_db1d bash scripts/local/verify-f-db1b-isolated-postgrest.sh || stop "POSTGREST_REAL_TEST=FAIL"
say F_DB1D_LOCAL_GATE=PASS
say "SECURITY_FINGERPRINT_PRE=$PRE_SECURITY"; say "SECURITY_FINGERPRINT_POST=$POST_SECURITY"
say "OTHER_FK_FINGERPRINT_PRE=$PRE_OTHER"; say "OTHER_FK_FINGERPRINT_POST=$POST_OTHER"
say "MIGRATION_0146_SHA256=$EXPECTED_SHA"
say REVIEW_ACCESSED=NO; say PRODUCTION_ACCESSED=NO; say LEGACY_ACCESSED=NO; say "EVIDENCE=$WORK"
