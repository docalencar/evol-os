#!/usr/bin/env bash
set -uo pipefail

say(){ printf '%s\n' "$*"; }
stop(){ say "STOP: $*"; RESULT=FAIL; exit 1; }

ROOT=$(cd "$(dirname "$0")/../.." && pwd) || exit 1
cd "$ROOT" || exit 1

MODE=${F_DB1C_MODE:-f_db1b}
case "$MODE" in
  f_db1b)
    MIGRATION=supabase/migrations/0144_harden_assessment_execution_tenant_fks.sql
    EXPECTED_MIGRATION_SHA=b9289408e100ead1b21e6cd4e063788ce4b9344dac310ae04c24d9a4553ab23f ;;
  f_db1c)
    MIGRATION=supabase/migrations/0145_harden_assessment_lifecycle_tenant_fks.sql
    EXPECTED_MIGRATION_SHA=a267ec22eadc795c1c2112039d57c99f2799b1746158f9d549d49fa4624d7b5f ;;
  f_db1d)
    MIGRATION=supabase/migrations/0146_harden_feedback_attachment_mention_tenant_fks.sql
    EXPECTED_MIGRATION_SHA=684501087acd717f55eed8b83911457f899ce7802217ed37dfe54d6a33ab0d65 ;;
  *) stop "invalid verifier mode" ;;
esac
PROBE_LIB=scripts/local/lib/postgrest-embed-probe.sh
POSTGRES_IMAGE=public.ecr.aws/supabase/postgres:17.6.1.167
POSTGRES_DIGEST=sha256:6942962433a569e87f228b4d4ab7e11db5deca64e43babb3a038443ad6c4f1bb
POSTGREST_IMAGE=public.ecr.aws/supabase/postgrest:v14.15
POSTGREST_DIGEST=sha256:2f8e7b656f09db697a8875177694b417b35cb76c21370de07fc54e711e902326
LABEL_KEY=io.evol.f-db1b-run-id
RESULT=UNKNOWN

for tool in docker supabase psql git tar shasum curl node openssl; do
  command -v "$tool" >/dev/null 2>&1 || stop "$tool unavailable"
done
[ -f "$MIGRATION" ] || stop "selected migration missing"
[ -f "$PROBE_LIB" ] || stop "shared PostgREST probe missing"
[ "$(shasum -a 256 "$MIGRATION" | cut -d' ' -f1)" = "$EXPECTED_MIGRATION_SHA" ] \
  || stop "selected migration hash mismatch"

RUN_ID=${F_DB1B_RUN_ID:-$(date -u +%Y%m%d%H%M%S)-$(openssl rand -hex 4)}
case "$RUN_ID" in *[!a-zA-Z0-9_.-]*|'') stop "invalid RUN_ID" ;; esac
PROJECT_ID="f-db1b-pgrst-${RUN_ID}"
PROJECT_ID=$(printf '%s' "$PROJECT_ID" | tr '[:upper:].' '[:lower:]_')
DB_CONTAINER="supabase_db_${PROJECT_ID}"
REST_CONTAINER="f-db1b-postgrest-${RUN_ID}"
NETWORK="supabase_network_${PROJECT_ID}"

residue_count(){
  {
    docker ps -aq --filter "label=$LABEL_KEY=$RUN_ID"
    docker ps -aq --filter "label=com.supabase.cli.project=$PROJECT_ID"
    docker network ls -q --filter "label=$LABEL_KEY=$RUN_ID"
    docker network ls -q --filter "label=com.supabase.cli.project=$PROJECT_ID"
    docker volume ls -q --filter "label=$LABEL_KEY=$RUN_ID"
    docker volume ls -q --filter "name=$PROJECT_ID"
  } | sed '/^$/d' | sort -u | wc -l | tr -d ' '
}

[ "$(residue_count)" = 0 ] || stop "RUN_ID residue exists; refuse automatic adoption or cleanup"

image_id(){ docker image inspect "$1" --format '{{.Id}}' 2>/dev/null; }
[ "$(image_id "$POSTGRES_IMAGE")" = "$POSTGRES_DIGEST" ] || stop "pinned PostgreSQL image is absent or has another digest; no pull allowed"
[ "$(image_id "$POSTGREST_IMAGE")" = "$POSTGREST_DIGEST" ] || stop "pinned PostgREST image is absent or has another digest; no pull allowed"

WORK=$(mktemp -d -t fdb1b-pgrst.XXXXXX) || stop "cannot create work directory"
chmod 700 "$WORK" || stop "cannot protect work directory"
SNAPSHOT="$WORK/repo"
mkdir -p "$SNAPSHOT"
CONFIG_FILE="$WORK/postgrest.conf"
PROOF_KEY_FILE="$WORK/verifier.jwt"
TEARDOWN_LOG="$WORK/teardown.log"
CANONICAL_DB_URL=$(supabase status -o env 2>/dev/null | sed -nE 's/^DB_URL="?([^"]*)"?$/\1/p' | tail -1)
case "$CANONICAL_DB_URL" in postgresql://*@localhost:*|postgresql://*@127.0.0.1:*) : ;; *) stop "canonical local DB identity unavailable" ;; esac
export F_DB1B_CANONICAL_DB_URL="$CANONICAL_DB_URL"
eval "$(node <<'NODE'
const u=new URL(process.env.F_DB1B_CANONICAL_DB_URL);
for (const [k,v] of Object.entries({CANON_HOST:u.hostname,CANON_PORT:u.port,CANON_USER:decodeURIComponent(u.username),CANON_PASSWORD:decodeURIComponent(u.password),CANON_DB:u.pathname.slice(1)}))
  process.stdout.write(`${k}=${JSON.stringify(v)}\n`);
NODE
)"
unset F_DB1B_CANONICAL_DB_URL CANONICAL_DB_URL

canonical_fp(){
  PGHOST="$CANON_HOST" PGPORT="$CANON_PORT" PGUSER="$CANON_USER" \
  PGPASSWORD="$CANON_PASSWORD" PGDATABASE="$CANON_DB" \
  psql -At --no-psqlrc -v ON_ERROR_STOP=1 -c \
    "select md5(string_agg(x,E'\\n' order by x)) from (select 'rls|'||c.relname::text||'|'||c.relrowsecurity::text||'|'||c.relforcerowsecurity::text x from pg_class c where c.oid in ('public.assessment_responses'::regclass,'public.people'::regclass) union all select 'acl|'||c.relname::text||'|'||coalesce(c.relacl::text,'') from pg_class c where c.oid in ('public.assessment_responses'::regclass,'public.people'::regclass) union all select 'function_acl|'||p.oid::regprocedure::text||'|'||coalesce(p.proacl::text,'') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('is_company_member','current_person_id','has_company_role')) q;"
}
CANONICAL_PRE=$(canonical_fp) || stop "canonical PRE fingerprint failed"

cleanup(){
  rc=$?
  set +e
  if docker ps -a --format '{{.Names}}' | grep -qx "$REST_CONTAINER"; then
    docker logs "$REST_CONTAINER" >"$WORK/postgrest.log" 2>&1
    docker rm -f "$REST_CONTAINER" >>"$TEARDOWN_LOG" 2>&1
  fi
  if docker ps -a --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 >>"$TEARDOWN_LOG" 2>&1 <<'SQL'
revoke f_db1b_postgrest_verifier from authenticator;
revoke all privileges on public.assessment_responses from f_db1b_postgrest_verifier;
revoke all privileges on public.assessment_answers from f_db1b_postgrest_verifier;
revoke all privileges on public.assessment_cycles from f_db1b_postgrest_verifier;
revoke all privileges on public.people from f_db1b_postgrest_verifier;
revoke all privileges on public.feedback_attachments from f_db1b_postgrest_verifier;
revoke all privileges on public.feedback_mentions from f_db1b_postgrest_verifier;
revoke all privileges on public.feedback_threads from f_db1b_postgrest_verifier;
revoke all privileges on public.feedback_messages from f_db1b_postgrest_verifier;
revoke all privileges on schema public from f_db1b_postgrest_verifier;
revoke execute on function public.is_company_member(uuid) from f_db1b_postgrest_verifier;
revoke execute on function public.current_person_id(uuid) from f_db1b_postgrest_verifier;
revoke execute on function public.has_company_role(uuid,text[]) from f_db1b_postgrest_verifier;
drop role f_db1b_postgrest_verifier;
grant usage on schema public to public;
SQL
  fi
  supabase stop --project-id "$PROJECT_ID" --no-backup >>"$TEARDOWN_LOG" 2>&1
  docker network rm "$NETWORK" >>"$TEARDOWN_LOG" 2>&1
  rm -f "$PROOF_KEY_FILE" "$CONFIG_FILE"
  canonical_post=$(canonical_fp 2>/dev/null)
  residual=$(residue_count)
  if [ "$CANONICAL_PRE" != "$canonical_post" ] || [ "$residual" != 0 ]; then
    say "TEARDOWN_PROOF=FAIL canonical_fingerprint_match=$([ "$CANONICAL_PRE" = "$canonical_post" ] && echo YES || echo NO) residual_resources=$residual"
    rc=1
  else
    say "TEARDOWN_PROOF=PASS"
  fi
  if [ "$rc" -eq 0 ] && [ "$RESULT" = PASS ]; then
    rm -rf "$WORK"
  else
    say "EVIDENCE=$WORK"
  fi
  [ "$rc" -eq 0 ] && [ "$RESULT" = PASS ] || rc=1
  exit "$rc"
}
trap cleanup EXIT INT TERM HUP

git archive HEAD | tar -x -C "$SNAPSHOT" || stop "cannot materialize Git snapshot"
cp "$MIGRATION" "$SNAPSHOT/$MIGRATION" || stop "cannot add reviewed 0144 to snapshot"

free_port(){ node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{process.stdout.write(String(s.address().port));s.close()})'; }
DB_PORT=$(free_port); SHADOW_PORT=$(free_port); API_PORT=$(free_port)
sed -i.bak \
  -e "s/^project_id = .*/project_id = \"$PROJECT_ID\"/" \
  -e "s/^port = 54321$/port = $API_PORT/" \
  -e "s/^port = 54322$/port = $DB_PORT/" \
  -e "s/^shadow_port = 54320$/shadow_port = $SHADOW_PORT/" \
  "$SNAPSHOT/supabase/config.toml"
rm -f "$SNAPSHOT/supabase/config.toml.bak"
grep -q "^port = $API_PORT$" "$SNAPSHOT/supabase/config.toml" || stop "temporary API port was not applied"
grep -q "^port = $DB_PORT$" "$SNAPSHOT/supabase/config.toml" || stop "temporary DB port was not applied"
grep -q "^shadow_port = $SHADOW_PORT$" "$SNAPSHOT/supabase/config.toml" || stop "temporary shadow port was not applied"

say "RUN_ID=$RUN_ID"
say "IMAGES_VERIFIED=PASS"
say "CANONICAL_DB_MUTATIONS=ZERO"

supabase db start --workdir "$SNAPSHOT" >"$WORK/db-start.log" 2>&1 || stop "isolated PostgreSQL start failed"
[ "$(docker inspect "$DB_CONTAINER" --format '{{.Config.Image}}' 2>/dev/null)" = "$POSTGRES_IMAGE" ] || stop "unexpected PostgreSQL image"

DISPOSABLE_PSQL=(env PGHOST=127.0.0.1 PGPORT="$DB_PORT" PGUSER=postgres PGPASSWORD=postgres PGDATABASE=postgres psql)
[ "$DB_PORT" != "$CANON_PORT" ] || stop "disposable database aliases canonical database"
supabase db reset --workdir "$SNAPSHOT" --no-seed >"$WORK/db-reset.log" 2>&1 || stop "isolated schema reproduction failed"
DISPOSABLE_PRE=$("${DISPOSABLE_PSQL[@]}" -At --no-psqlrc -v ON_ERROR_STOP=1 -c \
  "select md5(string_agg(x,E'\\n' order by x)) from (select 'schema_public_effective|usage='||has_schema_privilege('public','public','usage')::text||'|create='||has_schema_privilege('public','public','create')::text x union all select 'rls|'||c.relname::text||'|'||c.relrowsecurity::text||'|'||c.relforcerowsecurity::text from pg_class c where c.oid in ('public.assessment_responses'::regclass,'public.assessment_answers'::regclass,'public.assessment_cycles'::regclass,'public.people'::regclass,'public.feedback_attachments'::regclass,'public.feedback_mentions'::regclass,'public.feedback_threads'::regclass,'public.feedback_messages'::regclass) union all select 'acl|'||c.relname::text||'|'||coalesce(c.relacl::text,'') from pg_class c where c.oid in ('public.assessment_responses'::regclass,'public.assessment_answers'::regclass,'public.assessment_cycles'::regclass,'public.people'::regclass,'public.feedback_attachments'::regclass,'public.feedback_mentions'::regclass,'public.feedback_threads'::regclass,'public.feedback_messages'::regclass) union all select 'function_acl|'||p.oid::regprocedure::text||'|'||coalesce(p.proacl::text,'') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('is_company_member','current_person_id','has_company_role')) q;") || stop "disposable PRE fingerprint failed"
"${DISPOSABLE_PSQL[@]}" -At --no-psqlrc -v ON_ERROR_STOP=1 >"$WORK/schema-check.log" <<'SQL' || stop "0144 catalog verification failed"
select case when count(*)=5 then 'FIVE_FKS_VALID' else 'FAIL' end
from pg_constraint
where conname in (
  'assessment_responses_assessment_template_id_fkey',
  'assessment_responses_employee_id_fkey',
  'assessment_responses_evaluator_id_fkey',
  'assessment_cycle_participants_assessment_cycle_id_fkey',
  'assessment_cycle_participants_employee_id_fkey')
and contype='f' and convalidated and array_length(conkey,1)=2;
SQL
grep -qx FIVE_FKS_VALID "$WORK/schema-check.log" || stop "five validated composite FKs not observed"
if [ "$MODE" = f_db1c ] || [ "$MODE" = f_db1d ]; then
  LIFECYCLE_FKS=$("${DISPOSABLE_PSQL[@]}" -At --no-psqlrc -v ON_ERROR_STOP=1 -c \
    "select count(*) from pg_constraint where conname in ('assessment_responses_assessment_cycle_id_fkey','assessment_answers_assessment_response_id_fkey') and contype='f' and convalidated and array_length(conkey,1)=2 and array_length(confkey,1)=2;")
  [ "$LIFECYCLE_FKS" = 2 ] || stop "two lifecycle composite FKs not observed"
fi
if [ "$MODE" = f_db1d ]; then
  # The delete action is checked per constraint: a SET NULL that became CASCADE
  # would otherwise satisfy a composite-shape-only count.
  FEEDBACK_FKS=$("${DISPOSABLE_PSQL[@]}" -At --no-psqlrc -v ON_ERROR_STOP=1 -c \
    "select count(*) from (values ('feedback_attachments_thread_id_fkey','c'),('feedback_attachments_message_id_fkey','c'),('feedback_attachments_uploaded_by_employee_id_fkey','n'),('feedback_mentions_thread_id_fkey','c'),('feedback_mentions_message_id_fkey','c'),('feedback_mentions_mentioned_employee_id_fkey','c')) as e(name,da) join pg_constraint con on con.conname=e.name where con.contype='f' and con.convalidated and con.confdeltype=e.da and array_length(con.conkey,1)=2 and array_length(con.confkey,1)=2;")
  [ "$FEEDBACK_FKS" = 6 ] || stop "six Feedback composite FKs not observed"
fi

"${DISPOSABLE_PSQL[@]}" --no-psqlrc -v ON_ERROR_STOP=1 >"$WORK/verifier-role.log" <<'SQL' || stop "minimal verifier role setup failed"
create role f_db1b_postgrest_verifier nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
do $$ begin
  if not has_schema_privilege('public','public','usage') then
    raise exception 'UNEXPECTED_PUBLIC_SCHEMA_BASELINE';
  end if;
end $$;
revoke usage on schema public from public;
do $$ begin
  if has_schema_privilege('f_db1b_postgrest_verifier','public','usage')
    or has_table_privilege('f_db1b_postgrest_verifier','public.assessment_responses','select')
    or has_table_privilege('f_db1b_postgrest_verifier','public.people','select')
    or pg_has_role('authenticator','f_db1b_postgrest_verifier','member') then
    raise exception 'VERIFIER_PREGRANT_STATE_INVALID';
  end if;
end $$;
grant usage on schema public to f_db1b_postgrest_verifier;
-- assessment_cycle_id is required by the F-DB1c embed: PostgREST must READ the
-- FK column to resolve assessment_responses -> assessment_cycles, and a missing
-- column privilege surfaces as 42501 -> HTTP 403, not as an empty result. It was
-- absent while the F-DB1b embeds (employee_id, evaluator_id) were granted, which
-- is exactly why answer_response passed and response_cycle returned 403.
-- Still column-scoped: no table-wide SELECT, and teardown revokes ALL privileges.
grant select (id,assessment_cycle_id,employee_id,evaluator_id,company_id) on public.assessment_responses to f_db1b_postgrest_verifier;
grant select (id,assessment_response_id,company_id) on public.assessment_answers to f_db1b_postgrest_verifier;
grant select (id,company_id) on public.assessment_cycles to f_db1b_postgrest_verifier;
grant select (id,company_id) on public.people to f_db1b_postgrest_verifier;
grant execute on function public.is_company_member(uuid) to f_db1b_postgrest_verifier;
grant execute on function public.current_person_id(uuid) to f_db1b_postgrest_verifier;
grant execute on function public.has_company_role(uuid,text[]) to f_db1b_postgrest_verifier;
grant f_db1b_postgrest_verifier to authenticator;
SQL

if [ "$MODE" = f_db1d ]; then
  # Same rule as the F-DB1c fix: PostgREST must READ the FK column to resolve an
  # embedding, so every column named in a probed relationship is granted — and
  # nothing else. Column-scoped, never table-wide; teardown revokes all of it.
  "${DISPOSABLE_PSQL[@]}" --no-psqlrc -v ON_ERROR_STOP=1 >"$WORK/verifier-role-f-db1d.log" <<'SQL' || stop "f_db1d verifier grants failed"
grant select (id,thread_id,message_id,uploaded_by_employee_id,company_id) on public.feedback_attachments to f_db1b_postgrest_verifier;
grant select (id,thread_id,message_id,mentioned_employee_id,company_id) on public.feedback_mentions to f_db1b_postgrest_verifier;
-- sender_employee_id and receiver_employee_id are not FK columns of the probed
-- relationships: they are read by feedback_threads' OWN policy, which runs when
-- the child policy consults that table. Column privileges apply inside policy
-- expressions, and a missing one raises 42501 -> HTTP 403 before the embedding
-- is ever resolved. manager_id is reached one level deeper still, through the
-- `visibility = 'management'` branch of that same policy.
--
-- This is the F-DB1c lesson one level too shallow: granting the FK columns is
-- necessary and not sufficient. Each column below was falsified individually —
-- removing any one of the four brings the 403 back.
--
-- `visibility` is required by the EMBED TARGETS, not by the probed children:
-- feedback_messages' policy inlines the whole `visibility = 'management'` branch,
-- while the attachments and mentions policies stop short of it. Resolving an
-- embed selects FROM the target table, so the target's own policy runs too — and
-- measuring only the queried tables is what made the first fix incomplete.
grant select (id,company_id,sender_employee_id,receiver_employee_id,visibility) on public.feedback_threads to f_db1b_postgrest_verifier;
grant select (id,company_id) on public.feedback_messages to f_db1b_postgrest_verifier;
grant select (id,company_id,manager_id) on public.people to f_db1b_postgrest_verifier;
SQL
  WIDE=$("${DISPOSABLE_PSQL[@]}" -At --no-psqlrc -v ON_ERROR_STOP=1 -c \
    "select count(*) from pg_class c where c.relname in ('feedback_attachments','feedback_mentions','feedback_threads','feedback_messages') and has_table_privilege('f_db1b_postgrest_verifier', c.oid, 'select');")
  [ "$WIDE" = 0 ] || stop "a table-wide SELECT was granted on a Feedback table"
fi

ROLE_CHECK=$("${DISPOSABLE_PSQL[@]}" -At --no-psqlrc -v ON_ERROR_STOP=1 -c \
  "select count(*) from pg_roles where rolname='f_db1b_postgrest_verifier' and not rolcanlogin and not rolsuper and not rolcreatedb and not rolcreaterole and not rolinherit and not rolbypassrls;")
[ "$ROLE_CHECK" = 1 ] || stop "verifier role attributes invalid"

umask 077
cat >"$CONFIG_FILE" <<EOF
db-uri = "postgresql://authenticator:postgres@${DB_CONTAINER}:5432/postgres"
db-schemas = "public"
db-extra-search-path = "public,extensions"
db-anon-role = "anon"
jwt-secret = "$(openssl rand -hex 32)"
server-host = "0.0.0.0"
server-port = 3000
EOF
chmod 600 "$CONFIG_FILE"
# Replace the independently generated config secret with the signer secret
# without ever logging either value.
CONFIG_SECRET=$(sed -nE 's/^jwt-secret = "([^"]+)"/\1/p' "$CONFIG_FILE")
export F_DB1B_JWT_SECRET="$CONFIG_SECRET"
VERIFIER_KEY=$(node <<'NODE'
const c=require('crypto'), e=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const now=Math.floor(Date.now()/1000), h=e({alg:'HS256',typ:'JWT'});
const p=e({role:'f_db1b_postgrest_verifier',iat:now-5,exp:now+300});
process.stdout.write(`${h}.${p}.${c.createHmac('sha256',process.env.F_DB1B_JWT_SECRET).update(`${h}.${p}`).digest('base64url')}`);
NODE
)
EXPIRED_KEY=$(node <<'NODE'
const c=require('crypto'), e=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const now=Math.floor(Date.now()/1000), h=e({alg:'HS256',typ:'JWT'});
const p=e({role:'f_db1b_postgrest_verifier',iat:now-600,exp:now-300});
process.stdout.write(`${h}.${p}.${c.createHmac('sha256',process.env.F_DB1B_JWT_SECRET).update(`${h}.${p}`).digest('base64url')}`);
NODE
)
export F_DB1B_JWT_SECRET=$(openssl rand -hex 32)
INVALID_KEY=$(node <<'NODE'
const c=require('crypto'), e=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const now=Math.floor(Date.now()/1000), h=e({alg:'HS256',typ:'JWT'});
const p=e({role:'f_db1b_postgrest_verifier',iat:now-5,exp:now+300});
process.stdout.write(`${h}.${p}.${c.createHmac('sha256',process.env.F_DB1B_JWT_SECRET).update(`${h}.${p}`).digest('base64url')}`);
NODE
)
unset F_DB1B_JWT_SECRET CONFIG_SECRET
printf '%s' "$VERIFIER_KEY" >"$PROOF_KEY_FILE"
chmod 600 "$PROOF_KEY_FILE"

docker run -d --pull=never --name "$REST_CONTAINER" --network "$NETWORK" \
  --label "$LABEL_KEY=$RUN_ID" -p 127.0.0.1::3000 \
  --mount "type=bind,src=$CONFIG_FILE,dst=/etc/postgrest.conf,readonly" \
  "$POSTGREST_IMAGE" postgrest /etc/postgrest.conf >"$WORK/postgrest.cid" \
  || stop "isolated PostgREST start failed"
REST_PORT=$(docker port "$REST_CONTAINER" 3000/tcp | sed -nE 's/^127\.0\.0\.1:([0-9]+)$/\1/p' | head -1)
[ -n "$REST_PORT" ] || stop "PostgREST is not bound to loopback"
REST_URL="http://127.0.0.1:$REST_PORT"

READY=NO
for _ in 1 2 3 4 5 6 7 8 9 10; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 2 "$REST_URL/" 2>/dev/null || true)
  [ "$code" = 200 ] && { READY=YES; break; }
  sleep 1
done
[ "$READY" = YES ] || stop "PostgREST readiness failed"
say "READINESS=PASS"

auth_status(){
  key="${!1-}"; body="$WORK/auth-$2.json"
  printf 'header = "Authorization: Bearer %s"\nsilent\nshow-error\nmax-time = 10\noutput = "%s"\nwrite-out = "%%{http_code}"\nurl = "%s"\n' \
    "$key" "$body" "$REST_URL/assessment_responses?select=id&limit=0" | curl -K - 2>"$WORK/auth-curl.err"
}
INVALID_HTTP=$(auth_status INVALID_KEY invalid)
EXPIRED_HTTP=$(auth_status EXPIRED_KEY expired)
[ "$INVALID_HTTP" = 401 ] && grep -q '"code":"PGRST301"' "$WORK/auth-invalid.json" \
  || stop "invalid JWT was not rejected"
[ "$EXPIRED_HTTP" = 401 ] && grep -q '"code":"PGRST303"' "$WORK/auth-expired.json" \
  || stop "expired JWT was not rejected"
unset INVALID_KEY EXPIRED_KEY
say "JWT_NEGATIVE_TESTS=PASS"

# One implementation classifies all three proof requests. There is no retry.
. "$ROOT/$PROBE_LIB" || stop "cannot load shared probe"
if [ "$MODE" = f_db1b ]; then
  FIRST=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'people!assessment_responses_employee_id_fkey' "$WORK" direct assessment_responses)
  SECOND=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'people!assessment_responses_evaluator_id_fkey' "$WORK" direct assessment_responses)
  NEGATIVE=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'people!f_db1b_nonexistent_fkey' "$WORK" direct assessment_responses)
  say "POSTGREST_EMBED[employee]=$FIRST"
  say "POSTGREST_EMBED[evaluator]=$SECOND"
elif [ "$MODE" = f_db1d ]; then
  FIRST=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'feedback_threads!feedback_attachments_thread_id_fkey' "$WORK" direct feedback_attachments)
  SECOND=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'feedback_messages!feedback_attachments_message_id_fkey' "$WORK" direct feedback_attachments)
  THIRD=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'people!feedback_attachments_uploaded_by_employee_id_fkey' "$WORK" direct feedback_attachments)
  FOURTH=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'feedback_threads!feedback_mentions_thread_id_fkey' "$WORK" direct feedback_mentions)
  FIFTH=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'feedback_messages!feedback_mentions_message_id_fkey' "$WORK" direct feedback_mentions)
  SIXTH=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'people!feedback_mentions_mentioned_employee_id_fkey' "$WORK" direct feedback_mentions)
  NEGATIVE=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'feedback_threads!f_db1d_nonexistent_fkey' "$WORK" direct feedback_attachments)
  say "POSTGREST_EMBED[attachment_thread]=$FIRST"
  say "POSTGREST_EMBED[attachment_message]=$SECOND"
  say "POSTGREST_EMBED[attachment_uploader]=$THIRD"
  say "POSTGREST_EMBED[mention_thread]=$FOURTH"
  say "POSTGREST_EMBED[mention_message]=$FIFTH"
  say "POSTGREST_EMBED[mention_employee]=$SIXTH"
  # All six relationships are proven, not a sample: an embedding that resolves
  # today can stop resolving precisely because a constraint was renamed.
  for V in "$THIRD" "$FOURTH" "$FIFTH" "$SIXTH"; do
    [ "$V" = PASS ] || stop "positive embedding proof failed"
  done
else
  FIRST=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'assessment_cycles!assessment_responses_assessment_cycle_id_fkey' "$WORK" direct assessment_responses)
  SECOND=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'assessment_responses!assessment_answers_assessment_response_id_fkey' "$WORK" direct assessment_answers)
  NEGATIVE=$(postgrest_embed_probe "$REST_URL" VERIFIER_KEY 'assessment_responses!f_db1c_nonexistent_fkey' "$WORK" direct assessment_answers)
  say "POSTGREST_EMBED[response_cycle]=$FIRST"
  say "POSTGREST_EMBED[answer_response]=$SECOND"
fi
say "POSTGREST_NEGATIVE=$NEGATIVE"
[ "$FIRST" = PASS ] && [ "$SECOND" = PASS ] || stop "positive embedding proof failed"
[ "$NEGATIVE" = POSTGREST_ERROR_PGRST200 ] || stop "negative control did not produce PGRST200"

docker rm -f "$REST_CONTAINER" >/dev/null || stop "cannot stop PostgREST before privilege teardown"
"${DISPOSABLE_PSQL[@]}" --no-psqlrc -v ON_ERROR_STOP=1 >"$WORK/explicit-teardown.log" <<'SQL' || stop "explicit verifier teardown failed"
revoke f_db1b_postgrest_verifier from authenticator;
revoke all privileges on public.assessment_responses from f_db1b_postgrest_verifier;
revoke all privileges on public.assessment_answers from f_db1b_postgrest_verifier;
revoke all privileges on public.assessment_cycles from f_db1b_postgrest_verifier;
revoke all privileges on public.people from f_db1b_postgrest_verifier;
revoke all privileges on public.feedback_attachments from f_db1b_postgrest_verifier;
revoke all privileges on public.feedback_mentions from f_db1b_postgrest_verifier;
revoke all privileges on public.feedback_threads from f_db1b_postgrest_verifier;
revoke all privileges on public.feedback_messages from f_db1b_postgrest_verifier;
revoke all privileges on schema public from f_db1b_postgrest_verifier;
revoke execute on function public.is_company_member(uuid) from f_db1b_postgrest_verifier;
revoke execute on function public.current_person_id(uuid) from f_db1b_postgrest_verifier;
revoke execute on function public.has_company_role(uuid,text[]) from f_db1b_postgrest_verifier;
drop role f_db1b_postgrest_verifier;
grant usage on schema public to public;
SQL
DISPOSABLE_POST=$("${DISPOSABLE_PSQL[@]}" -At --no-psqlrc -v ON_ERROR_STOP=1 -c \
  "select md5(string_agg(x,E'\\n' order by x)) from (select 'schema_public_effective|usage='||has_schema_privilege('public','public','usage')::text||'|create='||has_schema_privilege('public','public','create')::text x union all select 'rls|'||c.relname::text||'|'||c.relrowsecurity::text||'|'||c.relforcerowsecurity::text from pg_class c where c.oid in ('public.assessment_responses'::regclass,'public.assessment_answers'::regclass,'public.assessment_cycles'::regclass,'public.people'::regclass,'public.feedback_attachments'::regclass,'public.feedback_mentions'::regclass,'public.feedback_threads'::regclass,'public.feedback_messages'::regclass) union all select 'acl|'||c.relname::text||'|'||coalesce(c.relacl::text,'') from pg_class c where c.oid in ('public.assessment_responses'::regclass,'public.assessment_answers'::regclass,'public.assessment_cycles'::regclass,'public.people'::regclass,'public.feedback_attachments'::regclass,'public.feedback_mentions'::regclass,'public.feedback_threads'::regclass,'public.feedback_messages'::regclass) union all select 'function_acl|'||p.oid::regprocedure::text||'|'||coalesce(p.proacl::text,'') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('is_company_member','current_person_id','has_company_role')) q;") || stop "disposable POST fingerprint failed"
[ "$DISPOSABLE_PRE" = "$DISPOSABLE_POST" ] || stop "disposable security fingerprint diverged after teardown"
ROLE_RESIDUE=$("${DISPOSABLE_PSQL[@]}" -At --no-psqlrc -v ON_ERROR_STOP=1 -c "select count(*) from pg_roles where rolname='f_db1b_postgrest_verifier';")
[ "$ROLE_RESIDUE" = 0 ] || stop "verifier role survived teardown"

unset VERIFIER_KEY
rm -f "$PROOF_KEY_FILE" "$CONFIG_FILE"
RESULT=PASS
say "POSTGREST_REAL_TEST=PASS"
say "DISPOSABLE_FINGERPRINT=PASS"
say "RESULT=PASS"
