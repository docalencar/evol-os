#!/usr/bin/env bash
# Read-only POST verifier for migration 0129. It has no mutation path.
set -uo pipefail
: "${DB_HOST:=127.0.0.1}"
: "${DB_PORT:=54322}"
: "${DB_USER:=postgres}"
: "${DB_NAME:=postgres}"
: "${PGPASSWORD:=postgres}"
export PGPASSWORD
OUT=$(mktemp -t evol0129post.XXXXXX)
AUTH_ERR=$(mktemp -t evol0129autherr.XXXXXX)
ANON_ERR=$(mktemp -t evol0129anonerr.XXXXXX)
trap 'rm -f "$OUT" "$AUTH_ERR" "$ANON_ERR"' EXIT
if ! DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_USER="$DB_USER" DB_NAME="$DB_NAME" \
  bash "$(dirname "$0")/verify-0129-activity-events-hardening-pre.sh" >"$OUT"; then
  printf '%s\n' 'POST_0129=QUERY_FAILED'; exit 1
fi
cat "$OUT"
val() { grep -m1 "^$1=" "$OUT" | cut -d= -f2-; }
FAIL=0
expect() { if [ "$(val "$1")" != "$2" ]; then printf 'FAIL %s expected=%s actual=%s\n' "$1" "$2" "$(val "$1")"; FAIL=1; fi; }
expect MIGRATION_0128_COUNT 1
expect MIGRATION_0129_COUNT 1
expect ACTIVITY_SELECT_PUBLIC false
expect ACTIVITY_SELECT_ANON false
expect ACTIVITY_SELECT_AUTHENTICATED false
expect ACTIVITY_CLIENT_PRIVILEGES 0
expect ACTIVITY_POLICY_COUNT 2
expect ACTIVITY_POLICY_FINGERPRINT 44f737d45509824130c2ba631de442ce
expect ACTIVITY_RLS_ENABLED true
expect TIMELINE_FILTERS_COMPANY true
expect TIMELINE_SECURITY_DEFINER true
expect TIMELINE_EXECUTE_AUTHENTICATED true
expect ENTITY_TIMELINE_STILL_PRESENT true
expect BRIDGE_PRESENT true
expect COMPOSITE_FKS_VALIDATED 7
expect RPC_EXACT_SIGNATURES 5
expect FEEDBACK_WRITE_PRIVILEGES 0
expect FEEDBACK_WRITE_POLICIES 0

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 --no-psqlrc -At \
  -c "set default_transaction_read_only=on; set role authenticated; select * from public.activity_events limit 0" \
  >"$AUTH_ERR" 2>&1; then
  printf '%s\n' 'FAIL authenticated direct LIMIT 0 unexpectedly succeeded'; FAIL=1
elif ! grep -Fq 'permission denied for table activity_events' "$AUTH_ERR"; then
  printf '%s\n' 'FAIL authenticated direct LIMIT 0 did not fail at the expected privilege boundary'; FAIL=1
else
  printf '%s\n' 'AUTHENTICATED_DIRECT_LIMIT_0=DENIED_AS_EXPECTED'
fi
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 --no-psqlrc -At \
  -c "set default_transaction_read_only=on; set role anon; select * from public.activity_events limit 0" \
  >"$ANON_ERR" 2>&1; then
  printf '%s\n' 'FAIL anon direct LIMIT 0 unexpectedly succeeded'; FAIL=1
elif ! grep -Fq 'permission denied for table activity_events' "$ANON_ERR"; then
  printf '%s\n' 'FAIL anon direct LIMIT 0 did not fail at the expected privilege boundary'; FAIL=1
else
  printf '%s\n' 'ANON_DIRECT_LIMIT_0=DENIED_AS_EXPECTED'
fi
if [ "$FAIL" -ne 0 ]; then printf '%s\n' 'POST_0129=FAIL'; exit 1; fi
printf '%s\n' 'POST_0129=PASS'
