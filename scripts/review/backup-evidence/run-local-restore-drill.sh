#!/usr/bin/env bash
# Synthetic PostgreSQL 17 restore drill. It never creates operational evidence.
set -Eeuo pipefail
IMAGE='postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24'
RUN_ID="backup-drill-$$"; SRC="${RUN_ID}-src"; DST="${RUN_ID}-dst"
WORK=$(mktemp -d -t review-backup-drill.XXXXXX); EVIDENCE=$(mktemp -d -t review-backup-proof.XXXXXX); START=$(date +%s); CLEANED=0
fail_stage(){ [ "${BACKUP_DRILL_FAIL_STAGE:-}" != "$1" ] || { echo "INJECTED_FAILURE=$1" >&2; return 1; }; }
cleanup(){
  [ "$CLEANED" -eq 1 ] && return 0
  docker rm -f "$SRC" "$DST" >/dev/null 2>&1 || true
  local left
  left=$(docker ps -a --filter "name=$RUN_ID" -q 2>/dev/null || echo unknown)
  [ -z "$left" ] || return 1
  fail_stage teardown || return 1
  CLEANED=1
  rm -rf -- "$WORK"
}
on_exit(){ local rc=$?; trap - EXIT INT TERM; if ! cleanup; then echo TEARDOWN=FAIL >&2; exit 1; fi; exit "$rc"; }
on_signal(){ trap - EXIT INT TERM; cleanup || true; exit 130; }
trap on_exit EXIT
trap on_signal INT TERM
for tool in docker shasum; do command -v "$tool" >/dev/null || { echo "STOP: $tool unavailable" >&2; exit 1; }; done
wait_ready(){
  local container=$1 deadline=$((SECONDS+60)) first second
  while (( SECONDS < deadline )); do
    if docker logs "$container" 2>&1 | grep -q 'PostgreSQL init process complete; ready for start up.'; then
      first=$(docker exec "$container" psql -U postgres -Atqc "select current_setting('server_version_num')||':'||pg_postmaster_start_time()" 2>/dev/null || true)
      sleep 1
      second=$(docker exec "$container" psql -U postgres -Atqc "select current_setting('server_version_num')||':'||pg_postmaster_start_time()" 2>/dev/null || true)
      [ -n "$first" ] && [ "$first" = "$second" ] && [[ "$first" == 17* ]] && return 0
    fi
    sleep 1
  done
  return 1
}
start(){ local container=$1; fail_stage startup; docker run -d --name "$container" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null; fail_stage connection; wait_ready "$container"; }
fingerprint(){
  local container=$1
  docker exec "$container" psql -U postgres -At -v ON_ERROR_STOP=1 -c "
    select concat_ws(E'\\n',
      current_setting('server_version_num'),
      (select string_agg(extname,',' order by extname) from pg_extension),
      (select string_agg(version,',' order by version) from supabase_migrations.schema_migrations),
      (select string_agg(id||':'||tenant||':'||secret,',' order by id) from public.backup_fixture),
      (select string_agg(column_name||':'||data_type||':'||is_nullable,',' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='backup_fixture'),
      (select pg_get_userbyid(relowner)||':'||relrowsecurity from pg_class where oid='public.backup_fixture'::regclass),
      (select string_agg(polname||':'||polcmd::text||':'||pg_get_expr(polqual,polrelid),',' order by polname) from pg_policy where polrelid='public.backup_fixture'::regclass),
      has_column_privilege('authenticated','public.backup_fixture','id','select')||':'||has_column_privilege('authenticated','public.backup_fixture','tenant','select')||':'||has_column_privilege('authenticated','public.backup_fixture','secret','select')||':'||has_table_privilege('public','public.backup_fixture','select'),
      (select last_value||':'||is_called from public.backup_fixture_id_seq),
      (select coalesce(string_agg(r.rolname||':'||coalesce(d.defaclacl::text,''),',' order by r.rolname),'') from pg_default_acl d join pg_roles r on r.oid=d.defaclrole),
      (select string_agg(rolname||':'||rolcanlogin,',' order by rolname) from pg_roles where rolname in ('app_owner','authenticated'))
    );" | shasum -a 256 | cut -d' ' -f1
}
start "$SRC"
cat >"$WORK/roles.sql" <<'SQL'
CREATE ROLE app_owner NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
SQL
fail_stage roles
docker exec -i "$SRC" psql -U postgres -v ON_ERROR_STOP=1 <"$WORK/roles.sql" >/dev/null
docker exec -i "$SRC" psql -U postgres -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE EXTENSION pgcrypto;
CREATE SCHEMA supabase_migrations AUTHORIZATION app_owner;
CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY);
INSERT INTO supabase_migrations.schema_migrations VALUES('0142');
CREATE TABLE public.backup_fixture(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant text NOT NULL, secret text NOT NULL);
ALTER TABLE public.backup_fixture OWNER TO app_owner;
INSERT INTO public.backup_fixture(tenant,secret) VALUES('synthetic','preserved');
ALTER TABLE public.backup_fixture ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_read ON public.backup_fixture FOR SELECT TO authenticated USING (tenant = 'synthetic'::text);
REVOKE ALL ON public.backup_fixture FROM PUBLIC;
GRANT SELECT(id,tenant) ON public.backup_fixture TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
SQL
SOURCE_FINGERPRINT=$(fingerprint "$SRC")
fail_stage dump
docker exec "$SRC" pg_dump -U postgres -Fc postgres >"$WORK/database.dump"
printf '["0142"]\n' >"$WORK/migration-ledger.json"
docker exec "$SRC" psql -U postgres -Atqc "select json_build_object('postgres_version_num',current_setting('server_version_num'),'extensions',(select array_agg(extname order by extname) from pg_extension));" >"$WORK/inventory.json"
for copy in copy-a copy-b; do mkdir -m 700 "$WORK/$copy"; cp "$WORK"/{database.dump,roles.sql,inventory.json,migration-ledger.json} "$WORK/$copy/"; done
for file in database.dump roles.sql inventory.json migration-ledger.json; do [ "$(shasum -a 256 "$WORK/copy-a/$file"|cut -d' ' -f1)" = "$(shasum -a 256 "$WORK/copy-b/$file"|cut -d' ' -f1)" ]; done
start "$DST"
docker exec -i "$DST" psql -U postgres -v ON_ERROR_STOP=1 <"$WORK/roles.sql" >/dev/null
docker cp "$WORK/database.dump" "$DST:/tmp/database.dump" >/dev/null
fail_stage restore
docker exec "$DST" pg_restore -U postgres -d postgres --clean --if-exists --exit-on-error /tmp/database.dump >/dev/null
VERSION=$(docker exec "$DST" psql -U postgres -Atqc "select current_setting('server_version_num')")
[[ "$VERSION" == 17* ]]
fail_stage integrity
DESTINATION_FINGERPRINT=$(fingerprint "$DST")
fail_stage fingerprint
[ "$SOURCE_FINGERPRINT" = "$DESTINATION_FINGERPRINT" ]
ARTIFACT_SHA=$(shasum -a 256 "$WORK/database.dump"|cut -d' ' -f1); DURATION=$(($(date +%s)-START)); RESTORED_AT=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
cleanup
trap - EXIT INT TERM
PROOF="$EVIDENCE/local-restore-proof.json"
printf '{"acl_pass":true,"artifact_sha256":"%s","contract_version":1,"data_pass":true,"evidence_id":"11111111-1111-4111-8111-111111111111","fingerprint":"%s","key_id":"local-synthetic-unsigned","ledger_max":"0142","postgres_major":17,"proof_id":"22222222-2222-4222-8222-222222222222","restore_duration_seconds":%s,"restored_at":"%s","rls_pass":true,"schema_pass":true,"teardown_pass":true}\n' "$ARTIFACT_SHA" "$SOURCE_FINGERPRINT" "$DURATION" "$RESTORED_AT" >"$PROOF"
echo "POSTGRES_VERSION_NUM=$VERSION"; echo "SOURCE_FINGERPRINT=$SOURCE_FINGERPRINT"; echo "DESTINATION_FINGERPRINT=$DESTINATION_FINGERPRINT"; echo COPY_INTEGRITY=PASS; echo "RESTORE_DURATION_SECONDS=$DURATION"; echo TEARDOWN=PASS; echo "LOCAL_UNSIGNED_PROOF=$PROOF"; echo RESTORE_DRILL=PASS
