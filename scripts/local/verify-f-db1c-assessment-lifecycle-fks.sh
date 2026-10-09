#!/usr/bin/env bash
set -uo pipefail
say(){ printf '%s\n' "$*"; }
stop(){ say "STOP: $*"; exit 1; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1
cd "$ROOT" || exit 1

MIGRATION=supabase/migrations/0145_harden_assessment_lifecycle_tenant_fks.sql
TEST=supabase/tests/assessment_lifecycle_tenant_composite_fks.test.sql
EXPECTED_SHA=a267ec22eadc795c1c2112039d57c99f2799b1746158f9d549d49fa4624d7b5f
for tool in supabase psql git tar shasum; do command -v "$tool" >/dev/null || stop "$tool unavailable"; done
[ "$(shasum -a 256 "$MIGRATION"|cut -d' ' -f1)" = "$EXPECTED_SHA" ] || stop "migration 0145 hash mismatch"

DB_URL=$(supabase status -o env 2>/dev/null|sed -nE 's/^DB_URL="?([^"]*)"?$/\1/p'|tail -1)
[ -n "$DB_URL" ] || DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
HOST=$(printf '%s' "$DB_URL"|sed -nE 's#^[a-z+]+://[^@]*@([^:/]+).*#\1#p')
case "$HOST" in localhost|127.0.0.1|::1|'[::1]') :;; *) stop "TARGET_PROVEN_LOCAL=NO";; esac
case "$DB_URL" in *supabase.co*|*supabase.com*) stop "TARGET_PROVEN_LOCAL=NO";; esac
say TARGET_PROVEN_LOCAL=YES

WORK=$(mktemp -d -t fdb1c0145.XXXXXX); PRE="$WORK/pre"; POST="$WORK/post"; mkdir -p "$PRE" "$POST"
git archive HEAD|tar -x -C "$PRE" || stop "cannot create PRE snapshot"
git archive HEAD|tar -x -C "$POST" || stop "cannot create POST snapshot"
cp "$MIGRATION" "$POST/$MIGRATION"; cp "$TEST" "$POST/$TEST"
psql_local(){ psql "$DB_URL" -v ON_ERROR_STOP=1 --no-psqlrc "$@"; }
fp(){ psql "$DB_URL" -At --no-psqlrc -v ON_ERROR_STOP=1 -c "$1"; }
offenders(){ psql "$DB_URL" --no-psqlrc -f supabase/gates/adr_0012_tenant_owned_fk_sweep.sql 2>&1|grep -oE "offenders: [^']*"|head -1|sed 's/^offenders: //'|awk -F', ' '{print NF}'; }
security_fp(){ fp "select md5(string_agg(x,E'\\n' order by x)) from (select 'rls|'||c.relname::text||'|'||c.relrowsecurity::text||'|'||c.relforcerowsecurity::text x from pg_class c where c.oid in ('public.assessment_responses'::regclass,'public.assessment_answers'::regclass,'public.assessment_cycles'::regclass) union all select 'policy|'||c.relname::text||'|'||p.polname::text||'|'||p.polcmd::text||'|'||coalesce(pg_get_expr(p.polqual,p.polrelid),'')||'|'||coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') from pg_policy p join pg_class c on c.oid=p.polrelid where c.oid in ('public.assessment_responses'::regclass,'public.assessment_answers'::regclass,'public.assessment_cycles'::regclass) union all select 'acl|'||c.relname::text||'|'||coalesce(c.relacl::text,'') from pg_class c where c.oid in ('public.assessment_responses'::regclass,'public.assessment_answers'::regclass,'public.assessment_cycles'::regclass) union all select 'rpc|'||p.oid::regprocedure::text||'|'||pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('generate_tenant_assessment_cycle_responses_v1','save_tenant_assessment_answer_v1','submit_tenant_assessment_response_v1')) q;"; }
other_fk_fp(){ fp "select md5(string_agg(conname||'|'||pg_get_constraintdef(oid,true),E'\\n' order by conrelid::regclass::text,conname)) from pg_constraint where contype='f' and connamespace='public'::regnamespace and conname not in ('assessment_responses_assessment_cycle_id_fkey','assessment_answers_assessment_response_id_fkey');"; }

say '[f-db1c] 1/6 PRE through 0144'
supabase db reset --workdir "$PRE">"$WORK/pre-reset.log" 2>&1 || stop "PRE reset failed"
PRE_SECURITY=$(security_fp) || stop "PRE security fingerprint failed"
PRE_OTHER=$(other_fk_fp) || stop "PRE other-FK fingerprint failed"
PRE_OFFENDERS=$(offenders) || stop "PRE offender census failed"
[ -n "$PRE_SECURITY" ] && [ -n "$PRE_OTHER" ] || stop "PRE fingerprint empty"
[ "$PRE_OFFENDERS" = 32 ] || stop "PRE offenders=$PRE_OFFENDERS"
say "PRE_FOUNDATION_OFFENDERS=$PRE_OFFENDERS"

say '[f-db1c] 2/6 apply 0145 and fingerprints'
psql_local -f "$MIGRATION">"$WORK/apply.log" 2>&1 || { tail -40 "$WORK/apply.log"; stop "0145 apply failed"; }
POST_SECURITY=$(security_fp) || stop "POST security fingerprint failed"
POST_OTHER=$(other_fk_fp) || stop "POST other-FK fingerprint failed"
POST_OFFENDERS=$(offenders) || stop "POST offender census failed"
[ -n "$POST_SECURITY" ] && [ -n "$POST_OTHER" ] || stop "POST fingerprint empty"
[ "$PRE_SECURITY" = "$POST_SECURITY" ] || stop "SECURITY_FINGERPRINT=FAIL"
[ "$PRE_OTHER" = "$POST_OTHER" ] || stop "OTHER_FK_FINGERPRINT=FAIL"
[ "$POST_OFFENDERS" = 30 ] || stop "POST offenders=$POST_OFFENDERS"
say SECURITY_FINGERPRINT=PASS; say OTHER_FK_FINGERPRINT=PASS; say "POST_FOUNDATION_OFFENDERS=$POST_OFFENDERS"

say '[f-db1c] 3/6 drift rejection'
supabase db reset --workdir "$PRE">"$WORK/drift-reset.log" 2>&1 || stop "drift reset failed"
psql_local -c 'alter table public.assessment_responses rename constraint assessment_responses_assessment_cycle_id_fkey to assessment_responses_assessment_cycle_id_fkey_drift;' >/dev/null
psql_local -f "$MIGRATION">"$WORK/drift.log" 2>&1; RC=$?
[ "$RC" -ne 0 ] && grep -q ASSESSMENT_LIFECYCLE_TENANT_FK_PREFLIGHT_FAILED "$WORK/drift.log" || stop "DRIFT_REJECTION=FAIL"
[ "$(fp "select count(*) from pg_constraint where conname like '%_company_fkey_new';")" = 0 ] || stop "DRIFT_BEFORE_DDL=FAIL"
say DRIFT_REJECTION=PASS

say '[f-db1c] 4/6 rollback after intermediate failure'
supabase db reset --workdir "$PRE">"$WORK/rollback-reset.log" 2>&1 || stop "rollback reset failed"
psql_local -c 'alter table public.assessment_answers add constraint assessment_answers_assessment_response_company_fkey_new check (true);' >/dev/null
psql_local -f "$MIGRATION">"$WORK/rollback.log" 2>&1; RC=$?
[ "$RC" -ne 0 ] || stop "INTERMEDIATE_FAILURE=FAIL"
[ "$(fp "select count(*) from pg_constraint where conname='assessment_responses_assessment_cycle_company_fkey_new';")" = 0 ] || stop "ROLLBACK_INTEGRAL=FAIL"
[ "$(fp "select array_length(conkey,1) from pg_constraint where conname='assessment_responses_assessment_cycle_id_fkey';")" = 1 ] || stop "ROLLBACK_INTEGRAL=FAIL"
say ROLLBACK_INTEGRAL=PASS

say '[f-db1c] 5/6 pgTAP and full suite'
supabase db reset --workdir "$POST">"$WORK/post-reset.log" 2>&1 || { tail -40 "$WORK/post-reset.log"; stop "POST reset failed"; }
supabase test db --workdir "$POST" "$TEST">"$WORK/focused.log" 2>&1 || { tail -80 "$WORK/focused.log"; stop "focused pgTAP failed"; }
supabase test db --workdir "$POST">"$WORK/full.log" 2>&1 || { tail -80 "$WORK/full.log"; stop "full DB suite failed"; }
say FOCUSED_PGTAP=PASS; say FULL_DB_SUITE=PASS

say '[f-db1c] 6/6 isolated PostgREST'
F_DB1C_MODE=f_db1c bash scripts/local/verify-f-db1b-isolated-postgrest.sh || stop "POSTGREST_REAL_TEST=FAIL"
say F_DB1C_LOCAL_GATE=PASS
say "SECURITY_FINGERPRINT_PRE=$PRE_SECURITY"; say "SECURITY_FINGERPRINT_POST=$POST_SECURITY"
say "OTHER_FK_FINGERPRINT_PRE=$PRE_OTHER"; say "OTHER_FK_FINGERPRINT_POST=$POST_OTHER"
say "MIGRATION_0145_SHA256=$EXPECTED_SHA"
say REVIEW_ACCESSED=NO; say PRODUCTION_ACCESSED=NO; say LEGACY_ACCESSED=NO; say "EVIDENCE=$WORK"
