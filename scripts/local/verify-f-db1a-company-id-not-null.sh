#!/usr/bin/env bash
# Local-only real-PostgreSQL gate for migration 0143. It creates disposable
# repository snapshots so PRE and failure cases never require editing an applied
# migration or contacting a hosted environment.
set -uo pipefail

say() { printf '%s\n' "$*"; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1
cd "$ROOT" || exit 1

MIGRATION=supabase/migrations/0143_enforce_assessment_answers_company_id_not_null.sql
TEST=supabase/tests/assessment_answers_company_id_not_null.test.sql
for tool in supabase psql git tar shasum; do
  command -v "$tool" >/dev/null 2>&1 || { say "STOP: $tool unavailable"; exit 1; }
done
[ -f "$MIGRATION" ] && [ -f "$TEST" ] || { say 'F_DB1A_LOCAL_GATE=FAIL'; exit 1; }

DB_URL=$(supabase status -o env 2>/dev/null | sed -nE 's/^DB_URL="?([^"]*)"?$/\1/p' | tail -1)
[ -n "$DB_URL" ] || DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DB_HOST=$(printf '%s' "$DB_URL" | sed -nE 's#^[a-z+]+://[^@]*@([^:/]+).*#\1#p')
case "$DB_HOST" in localhost|127.0.0.1|::1|'[::1]') : ;; *) say "STOP: non-local DB host: ${DB_HOST:-unparsed}"; exit 1 ;; esac
case "$DB_URL" in *supabase.co*|*supabase.com*) say 'STOP: hosted DB URL refused'; exit 1 ;; esac
say "TARGET_PROVEN_LOCAL=YES host=$DB_HOST"

WORK=$(mktemp -d -t fdb1a0143.XXXXXX)
PRE_REPO="$WORK/pre"
POST_REPO="$WORK/post"
mkdir -p "$PRE_REPO" "$POST_REPO"
git archive HEAD | tar -x -C "$PRE_REPO" || { say 'CANONICAL_PRE_SNAPSHOT=FAIL'; exit 1; }
git archive HEAD | tar -x -C "$POST_REPO" || { say 'CANONICAL_POST_SNAPSHOT=FAIL'; exit 1; }
cp "$MIGRATION" "$POST_REPO/$MIGRATION"
cp "$TEST" "$POST_REPO/$TEST"

psql_local() { psql "$DB_URL" -v ON_ERROR_STOP=1 --no-psqlrc "$@"; }
fingerprint() {
  psql "$DB_URL" -v ON_ERROR_STOP=1 --no-psqlrc -At -c \
    "select md5(coalesce(string_agg(conname::text||'|'||pg_get_constraintdef(oid,true)||'|'||confupdtype::text||'|'||confdeltype::text, E'\\n' order by conname),'')) from pg_constraint where conrelid='public.assessment_answers'::regclass and contype='f';"
}
not_null() {
  psql "$DB_URL" -v ON_ERROR_STOP=1 --no-psqlrc -At -c \
    "select attnotnull::int from pg_attribute where attrelid='public.assessment_answers'::regclass and attname='company_id' and not attisdropped;"
}
aux_check_count() {
  psql "$DB_URL" -v ON_ERROR_STOP=1 --no-psqlrc -At -c \
    "select count(*) from pg_constraint where conrelid='public.assessment_answers'::regclass and conname='assessment_answers_company_id_not_null_check';"
}

say '[f-db1a-0143] 1/6 reset disposable PRE history (0001..0142)'
supabase db reset --workdir "$PRE_REPO" >"$WORK/pre-reset.log" 2>&1 || {
  say 'PRE_RESET=FAIL'; tail -30 "$WORK/pre-reset.log"; exit 1; }
PRE_FK=$(fingerprint) || exit 1
[ "$(not_null)" = 0 ] || { say 'PRE_NULLABILITY=FAIL'; exit 1; }
say "FK_FINGERPRINT_PRE=$PRE_FK"

say '[f-db1a-0143] 2/6 apply 0143 to an empty canonical local state'
psql_local -f "$MIGRATION" >"$WORK/empty-apply.log" 2>&1 || {
  say 'EMPTY_APPLY=FAIL'; tail -30 "$WORK/empty-apply.log"; exit 1; }
POST_FK=$(fingerprint) || exit 1
[ "$(not_null)" = 1 ] || { say 'POST_NULLABILITY=FAIL'; exit 1; }
[ "$(aux_check_count)" = 0 ] || { say 'AUXILIARY_CHECK_REMOVAL=FAIL'; exit 1; }
[ "$PRE_FK" = "$POST_FK" ] || { say 'FK_FINGERPRINT_PRESERVATION=FAIL'; exit 1; }
say 'EMPTY_APPLY=PASS'
say "FK_FINGERPRINT_POST=$POST_FK"
say 'FK_FINGERPRINT_PRESERVATION=PASS'

say '[f-db1a-0143] 3/6 reset PRE and create a valid populated historical row'
supabase db reset --workdir "$PRE_REPO" >"$WORK/populated-reset.log" 2>&1 || {
  say 'POPULATED_RESET=FAIL'; tail -30 "$WORK/populated-reset.log"; exit 1; }
psql_local >"$WORK/populated-fixture.log" 2>&1 <<'SQL'
insert into public.companies(id,name,slug) values
  ('fdb1a000-0000-4000-8000-000000000001','F DB1a valid','f-db1a-valid');
set session_replication_role=replica;
insert into public.assessments(id,company_id,employee_id,status) values
  ('fdb1a000-0000-4000-8000-000000000101','fdb1a000-0000-4000-8000-000000000001',
   'fdb1a000-0000-4000-8000-000000000201','draft');
set session_replication_role=origin;
insert into public.assessment_answers(id,company_id,assessment_id) values
  ('fdb1a000-0000-4000-8000-000000000301','fdb1a000-0000-4000-8000-000000000001',
   'fdb1a000-0000-4000-8000-000000000101');
SQL
[ "$?" -eq 0 ] || { say 'POPULATED_FIXTURE=FAIL'; tail -30 "$WORK/populated-fixture.log"; exit 1; }
psql_local -f "$MIGRATION" >"$WORK/populated-apply.log" 2>&1 || {
  say 'POPULATED_APPLY=FAIL'; tail -30 "$WORK/populated-apply.log"; exit 1; }
[ "$(not_null)" = 1 ] || { say 'POPULATED_NULLABILITY=FAIL'; exit 1; }
[ "$(fingerprint)" = "$PRE_FK" ] || { say 'POPULATED_FK_FINGERPRINT=FAIL'; exit 1; }
say 'POPULATED_APPLY=PASS'

say '[f-db1a-0143] 4/6 prove ambiguous historical data fails before schema change'
supabase db reset --workdir "$PRE_REPO" >"$WORK/rollback-reset.log" 2>&1 || {
  say 'ROLLBACK_RESET=FAIL'; tail -30 "$WORK/rollback-reset.log"; exit 1; }
psql_local >"$WORK/ambiguous-fixture.log" 2>&1 <<'SQL'
insert into public.companies(id,name,slug) values
  ('fdb1a000-0000-4000-8000-000000000001','F DB1a tenant A','f-db1a-a'),
  ('fdb1a000-0000-4000-8000-000000000002','F DB1a tenant B','f-db1a-b');
set session_replication_role=replica;
insert into public.assessments(id,company_id,employee_id,status) values
  ('fdb1a000-0000-4000-8000-000000000101','fdb1a000-0000-4000-8000-000000000001',
   'fdb1a000-0000-4000-8000-000000000201','draft');
insert into public.assessment_responses(
  id,company_id,assessment_cycle_id,assessment_template_id,
  assessment_execution_snapshot_id,employee_id,evaluator_id,status,perspective
) values (
  'fdb1a000-0000-4000-8000-000000000102','fdb1a000-0000-4000-8000-000000000002',
  'fdb1a000-0000-4000-8000-000000000401','fdb1a000-0000-4000-8000-000000000402',
  'fdb1a000-0000-4000-8000-000000000403','fdb1a000-0000-4000-8000-000000000404',
  'fdb1a000-0000-4000-8000-000000000405','draft','legacy_unknown');
insert into public.assessment_answers(
  id,assessment_id,assessment_response_id,assessment_execution_snapshot_id,
  assessment_execution_snapshot_question_id,score
) values
  ('fdb1a000-0000-4000-8000-000000000301','fdb1a000-0000-4000-8000-000000000101',
   'fdb1a000-0000-4000-8000-000000000102','fdb1a000-0000-4000-8000-000000000403',
   'fdb1a000-0000-4000-8000-000000000406',3),
  ('fdb1a000-0000-4000-8000-000000000302','fdb1a000-0000-4000-8000-000000000101',
   'fdb1a000-0000-4000-8000-000000000102','fdb1a000-0000-4000-8000-000000000403',
   'fdb1a000-0000-4000-8000-000000000407',4);
update public.assessment_answers
set company_id='fdb1a000-0000-4000-8000-000000000001'
where id='fdb1a000-0000-4000-8000-000000000302';
set session_replication_role=origin;
SQL
[ "$?" -eq 0 ] || { say 'AMBIGUOUS_FIXTURE=FAIL'; tail -30 "$WORK/ambiguous-fixture.log"; exit 1; }
set +e
psql_local -f "$MIGRATION" >"$WORK/ambiguous-apply.log" 2>&1
AMBIGUOUS_EXIT=$?
set -e
[ "$AMBIGUOUS_EXIT" -ne 0 ] || { say 'AMBIGUOUS_PREFLIGHT=FAIL expected rejection'; exit 1; }
grep -q 'ASSESSMENT_ANSWERS_COMPANY_ID_PREFLIGHT_FAILED' "$WORK/ambiguous-apply.log" || {
  say 'AMBIGUOUS_PREFLIGHT=FAIL wrong error'; tail -30 "$WORK/ambiguous-apply.log"; exit 1; }
grep -Eq 'null_company=[1-9][0-9]* .*orphaned_origin=[1-9][0-9]* .*ambiguous_origin=[1-9][0-9]* .*tenant_divergence=[1-9][0-9]* .*match_simple_bypass=[1-9][0-9]*' "$WORK/ambiguous-apply.log" || {
  say 'NEGATIVE_CENSUS=FAIL'; tail -30 "$WORK/ambiguous-apply.log"; exit 1; }
[ "$(not_null)" = 0 ] || { say 'ROLLBACK_NULLABILITY=FAIL'; exit 1; }
[ "$(aux_check_count)" = 0 ] || { say 'ROLLBACK_AUXILIARY_CHECK=FAIL'; exit 1; }
[ "$(fingerprint)" = "$PRE_FK" ] || { say 'ROLLBACK_FK_FINGERPRINT=FAIL'; exit 1; }
say 'AMBIGUOUS_PREFLIGHT=PASS'
say 'ROLLBACK_INTEGRAL=PASS'

say '[f-db1a-0143] 5/6 reset through 0143 and run focused pgTAP'
supabase db reset --workdir "$POST_REPO" >"$WORK/post-reset.log" 2>&1 || {
  say 'POST_RESET=FAIL'; tail -30 "$WORK/post-reset.log"; exit 1; }
supabase test db --workdir "$POST_REPO" "$TEST" >"$WORK/focused-test.log" 2>&1 || {
  say 'FOCUSED_PGTAP=FAIL'; tail -60 "$WORK/focused-test.log"; exit 1; }
say 'FOCUSED_PGTAP=PASS'

say '[f-db1a-0143] 6/6 full canonical DB suite'
supabase test db --workdir "$POST_REPO" >"$WORK/full-test.log" 2>&1 || {
  say 'FULL_DB_SUITE=FAIL'; tail -80 "$WORK/full-test.log"; exit 1; }
say 'FULL_DB_SUITE=PASS'
say 'F_DB1A_LOCAL_GATE=PASS'
say "MIGRATION_0143_SHA256=$(shasum -a 256 "$MIGRATION" | cut -d' ' -f1)"
say 'BACKFILL_EXECUTED=NO'
say 'REVIEW_ACCESSED=NO'
say 'PRODUCTION_ACCESSED=NO'
say 'LEGACY_ACCESSED=NO'
say "EVIDENCE=$WORK"
