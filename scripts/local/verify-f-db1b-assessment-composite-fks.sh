#!/usr/bin/env bash
set -uo pipefail
say(){ printf '%s\n' "$*"; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1; cd "$ROOT" || exit 1
# Declared before the self-test block below: that path sources the library, and
# under `set -u` a later declaration would abort it before any probe ran.
PROBE_LIB=scripts/local/lib/postgrest-embed-probe.sh
# ---------------------------------------------------------------------------
# SELF-TEST MODE — exercises ONLY the shared probe, against a URL the caller
# supplies, with no Supabase stack and no database work.
#
#   F_DB1B_SELFTEST_URL=http://127.0.0.1:9999 \
#   F_DB1B_SELFTEST_KEY=dummy bash scripts/local/verify-f-db1b-assessment-composite-fks.sh
#
# It runs the SAME function the real step runs — see PROBE_LIB below — so this
# mode cannot drift away from production behaviour. The regression suite proves
# that by sabotaging the library and asserting this verdict changes.
if [ -n "${F_DB1B_SELFTEST_URL:-}" ]; then
  for tool in curl node; do command -v "$tool" >/dev/null || { say "STOP: $tool unavailable"; exit 1; }; done
  # shellcheck source=lib/postgrest-embed-probe.sh
  . "$ROOT/$PROBE_LIB" || { say "STOP: shared probe library unavailable"; exit 1; }
  SELFTEST_KEY="${F_DB1B_SELFTEST_KEY:-selftest}"
  WORK=$(mktemp -d -t fdb1bself.XXXXXX)
  R1=$(postgrest_embed_probe "$F_DB1B_SELFTEST_URL" SELFTEST_KEY 'people!assessment_responses_employee_id_fkey' "$WORK")
  R2=$(postgrest_embed_probe "$F_DB1B_SELFTEST_URL" SELFTEST_KEY 'people!assessment_responses_evaluator_id_fkey' "$WORK")
  say "POSTGREST_EMBED[employee]=$R1"
  say "POSTGREST_EMBED[evaluator]=$R2"
  case "$R1" in NON_LOOPBACK_TARGET) say POSTGREST_TARGET_PROVEN_LOCAL=NO ;; esac
  rm -rf "$WORK"
  if [ "$R1" = PASS ] && [ "$R2" = PASS ]; then say POSTGREST_REAL_TEST=PASS; exit 0; fi
  say POSTGREST_REAL_TEST=FAIL; exit 1
fi

MIGRATION=supabase/migrations/0144_harden_assessment_execution_tenant_fks.sql
TEST=supabase/tests/assessment_execution_tenant_composite_fks.test.sql
for tool in supabase psql git tar shasum curl node; do command -v "$tool">/dev/null || { say "STOP: $tool unavailable"; exit 1; }; done
DB_URL=$(supabase status -o env 2>/dev/null|sed -nE 's/^DB_URL="?([^"]*)"?$/\1/p'|tail -1)
[ -n "$DB_URL" ] || DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
HOST=$(printf '%s' "$DB_URL"|sed -nE 's#^[a-z+]+://[^@]*@([^:/]+).*#\1#p')
case "$HOST" in localhost|127.0.0.1|::1|'[::1]') :;; *) say 'TARGET_PROVEN_LOCAL=NO'; exit 1;; esac
case "$DB_URL" in *supabase.co*|*supabase.com*) say 'TARGET_PROVEN_LOCAL=NO'; exit 1;; esac
say 'TARGET_PROVEN_LOCAL=YES'
WORK=$(mktemp -d -t fdb1b0144.XXXXXX); PRE="$WORK/pre"; POST="$WORK/post"; mkdir -p "$PRE" "$POST"
git archive HEAD|tar -x -C "$PRE" || exit 1; git archive HEAD|tar -x -C "$POST" || exit 1
cp "$MIGRATION" "$POST/$MIGRATION"; cp "$TEST" "$POST/$TEST"
psql_local(){ psql "$DB_URL" -v ON_ERROR_STOP=1 --no-psqlrc "$@"; }
fp(){ psql "$DB_URL" -At --no-psqlrc -v ON_ERROR_STOP=1 -c "$1"; }
security_fp(){ fp "select md5(string_agg(x,E'\\n' order by x)) from (select 'rls|'||c.relname::text||'|'||c.relrowsecurity::text||'|'||c.relforcerowsecurity::text x from pg_class c where c.relname in ('assessment_responses','assessment_cycle_participants') union all select 'policy|'||c.relname::text||'|'||p.polname::text||'|'||p.polcmd::text||'|'||coalesce(pg_get_expr(p.polqual,p.polrelid),'')||'|'||coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname in ('assessment_responses','assessment_cycle_participants') union all select 'acl|'||c.relname::text||'|'||coalesce(c.relacl::text,'') from pg_class c where c.relname in ('assessment_responses','assessment_cycle_participants') union all select 'rpc|'||p.proname::text||'|'||pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('add_tenant_assessment_cycle_participants_v1','remove_tenant_assessment_cycle_participant_v1','generate_tenant_assessment_cycle_responses_v1')) q;"; }
fk_fp(){ fp "select md5(string_agg(conname||'|'||pg_get_constraintdef(oid,true),E'\\n' order by conname)) from pg_constraint where conrelid in ('public.assessment_responses'::regclass,'public.assessment_cycle_participants'::regclass) and contype='f' and conname not in ('assessment_responses_assessment_template_id_fkey','assessment_responses_employee_id_fkey','assessment_responses_evaluator_id_fkey','assessment_cycle_participants_assessment_cycle_id_fkey','assessment_cycle_participants_employee_id_fkey');"; }
offenders(){ psql "$DB_URL" --no-psqlrc -f supabase/gates/adr_0012_tenant_owned_fk_sweep.sql 2>&1|grep -oE "offenders: [^']*"|head -1|sed 's/^offenders: //'|awk -F', ' '{print NF}'; }

say '[f-db1b] 1/6 canonical PRE through 0143'
supabase db reset --workdir "$PRE">"$WORK/pre-reset.log" 2>&1 || { tail -30 "$WORK/pre-reset.log"; exit 1; }
PRE_SECURITY=$(security_fp) || exit 1; PRE_OTHER_FKS=$(fk_fp) || exit 1; PRE_OFFENDERS=$(offenders) || exit 1
[ -n "$PRE_SECURITY" ] && [ -n "$PRE_OTHER_FKS" ] || { say PRE_FINGERPRINT=FAIL; exit 1; }
[ "$PRE_OFFENDERS" = 37 ] || { say "PRE_FOUNDATION_OFFENDERS=$PRE_OFFENDERS"; exit 1; }
say "PRE_FOUNDATION_OFFENDERS=$PRE_OFFENDERS"

say '[f-db1b] 2/6 apply 0144 and compare protected fingerprints'
psql_local -f "$MIGRATION">"$WORK/apply.log" 2>&1 || { tail -40 "$WORK/apply.log"; exit 1; }
POST_SECURITY=$(security_fp) || exit 1; POST_OTHER_FKS=$(fk_fp) || exit 1; POST_OFFENDERS=$(offenders) || exit 1
[ -n "$POST_SECURITY" ] && [ -n "$POST_OTHER_FKS" ] || { say POST_FINGERPRINT=FAIL; exit 1; }
[ "$PRE_SECURITY" = "$POST_SECURITY" ] || { say SECURITY_FINGERPRINT=FAIL; exit 1; }
[ "$PRE_OTHER_FKS" = "$POST_OTHER_FKS" ] || { say OTHER_FK_FINGERPRINT=FAIL; exit 1; }
[ "$POST_OFFENDERS" = 32 ] || { say "POST_FOUNDATION_OFFENDERS=$POST_OFFENDERS"; exit 1; }
say SECURITY_FINGERPRINT=PASS; say OTHER_FK_FINGERPRINT=PASS; say "POST_FOUNDATION_OFFENDERS=$POST_OFFENDERS"

say '[f-db1b] 3/6 drift is rejected before DDL'
supabase db reset --workdir "$PRE">"$WORK/drift-reset.log" 2>&1 || exit 1
psql_local -c 'alter table public.assessment_responses rename constraint assessment_responses_employee_id_fkey to assessment_responses_employee_id_fkey_drift;' >/dev/null
psql_local -f "$MIGRATION">"$WORK/drift.log" 2>&1; RC=$?   # explicit exit code; errexit stays off
[ "$RC" -ne 0 ] && grep -q ASSESSMENT_EXECUTION_TENANT_FK_PREFLIGHT_FAILED "$WORK/drift.log" || { say DRIFT_REJECTION=FAIL; exit 1; }
[ "$(fp "select count(*) from pg_indexes where indexname='assessment_responses_template_company_idx';")" = 0 ] || { say DRIFT_BEFORE_DDL=FAIL; exit 1; }
say DRIFT_REJECTION=PASS

say '[f-db1b] 4/6 failure after first DDL rolls back atomically'
supabase db reset --workdir "$PRE">"$WORK/rollback-reset.log" 2>&1 || exit 1
psql_local -c 'alter table public.assessment_responses add constraint assessment_responses_assessment_template_company_fkey_new check (true);' >/dev/null
psql_local -f "$MIGRATION">"$WORK/rollback.log" 2>&1; RC=$?   # explicit exit code; errexit stays off
[ "$RC" -ne 0 ] || { say INTERMEDIATE_FAILURE=FAIL; exit 1; }
[ "$(fp "select count(*) from pg_indexes where indexname='assessment_responses_template_company_idx';")" = 0 ] || { say ROLLBACK=FAIL; exit 1; }
[ "$(fp "select count(*) from pg_constraint where conname in ('assessment_responses_employee_company_fkey_new','assessment_responses_evaluator_company_fkey_new');")" = 0 ] || { say ROLLBACK=FAIL; exit 1; }
say ROLLBACK_INTEGRAL=PASS

say '[f-db1b] 5/6 focused pgTAP and full DB suite'
supabase db reset --workdir "$POST">"$WORK/post-reset.log" 2>&1 || { tail -40 "$WORK/post-reset.log"; exit 1; }
supabase test db --workdir "$POST" "$TEST">"$WORK/focused.log" 2>&1 || { tail -80 "$WORK/focused.log"; exit 1; }
supabase test db --workdir "$POST">"$WORK/full.log" 2>&1 || { tail -80 "$WORK/full.log"; exit 1; }
say FOCUSED_PGTAP=PASS; say FULL_DB_SUITE=PASS

say '[f-db1b] 6/6 PostgREST embedding resolution'
#
# The previous version of this step ran two greps over a TypeScript file and
# printed POSTGREST_NAMES=PASS. That proved the application MENTIONS the hint
# names; it proved nothing about whether PostgREST still RESOLVES them after
# 0144 renamed the constraints — which is the entire relational risk of this
# migration, because PostgREST derives its relationship cache from the FKs.
#
# The static check is kept, because "the app still asks for these names" is a
# real precondition — but it is reported under its own key and can never stand
# in for HTTP evidence.
REPO_FILE=apps/web/src/features/assessments/repositories/assessment-response-repository.ts
EMBED_EMPLOYEE='people!assessment_responses_employee_id_fkey'
EMBED_EVALUATOR='people!assessment_responses_evaluator_id_fkey'
grep -q "$EMBED_EMPLOYEE" "$REPO_FILE" || { say POSTGREST_STATIC_CHECK=FAIL; exit 1; }
grep -q "$EMBED_EVALUATOR" "$REPO_FILE" || { say POSTGREST_STATIC_CHECK=FAIL; exit 1; }
say POSTGREST_STATIC_CHECK=PASS

# The real proof runs in a disposable PostgreSQL/PostgREST stack. It never uses
# the canonical local Supabase database as a destination and owns its complete
# role/grant lifecycle. HTTP classification remains in the shared probe library.
bash scripts/local/verify-f-db1b-isolated-postgrest.sh \
  || { say POSTGREST_REAL_TEST=FAIL; exit 1; }
say F_DB1B_LOCAL_GATE=PASS
say "FK_FINGERPRINT_PRE=$PRE_OTHER_FKS"; say "FK_FINGERPRINT_POST=$POST_OTHER_FKS"
say "SECURITY_FINGERPRINT_PRE=$PRE_SECURITY"; say "SECURITY_FINGERPRINT_POST=$POST_SECURITY"
say "MIGRATION_0144_SHA256=$(shasum -a 256 "$MIGRATION"|cut -d' ' -f1)"
say REVIEW_ACCESSED=NO; say PRODUCTION_ACCESSED=NO; say LEGACY_ACCESSED=NO; say "EVIDENCE=$WORK"
