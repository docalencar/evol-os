import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const runner = readFileSync(resolve(import.meta.dirname, "verify-f-db1b-isolated-postgrest.sh"), "utf8")
const probe = readFileSync(resolve(import.meta.dirname, "lib/postgrest-embed-probe.sh"), "utf8")

test("pins locally present PostgreSQL and PostgREST image digests and forbids pulls", () => {
  assert.match(runner, /POSTGRES_DIGEST=sha256:[a-f0-9]{64}/)
  assert.match(runner, /POSTGREST_DIGEST=sha256:[a-f0-9]{64}/)
  assert.match(runner, /--pull=never/)
})

test("uses an isolated project, network and disposable database port", () => {
  assert.match(runner, /PROJECT_ID="f-db1b-pgrst-\$\{RUN_ID\}"/)
  assert.match(runner, /NETWORK="supabase_network_\$\{PROJECT_ID\}"/)
  assert.match(runner, /\[ "\$DB_PORT" != "\$CANON_PORT" \]/)
})

test("refuses RUN_ID residue instead of adopting or cleaning it", () => {
  assert.match(runner, /RUN_ID residue exists; refuse automatic adoption or cleanup/)
})

test("the verifier role is NOLOGIN and has no administrative or RLS bypass capability", () => {
  assert.match(runner, /create role f_db1b_postgrest_verifier nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls/)
})

test("grants only schema usage, required columns, policy helpers and membership", () => {
  assert.match(runner, /VERIFIER_PREGRANT_STATE_INVALID/)
  assert.match(runner, /grant usage on schema public/)
  assert.match(runner, /grant select \(id,employee_id,evaluator_id,company_id\) on public\.assessment_responses/)
  assert.match(runner, /grant select \(id,company_id\) on public\.people/)
  for (const fn of ["is_company_member", "current_person_id", "has_company_role"]) {
    assert.match(runner, new RegExp(`grant execute on function public\\.${fn}`))
  }
  assert.doesNotMatch(runner, /service_role/i)
  assert.doesNotMatch(runner, /disable row level security/i)
})

test("invalid and expired JWTs must be rejected by real PostgREST", () => {
  assert.match(runner, /INVALID_HTTP.*PGRST301/s)
  assert.match(runner, /EXPIRED_HTTP.*PGRST303/s)
  assert.match(runner, /JWT_NEGATIVE_TESTS=PASS/)
})

test("credentials stay out of curl argv and temporary files are protected", () => {
  assert.match(runner, /chmod 700 "\$WORK"/)
  assert.match(runner, /chmod 600 "\$PROOF_KEY_FILE"/)
  assert.match(probe, /curl -K -/)
  assert.doesNotMatch(probe, /curl .*Bearer/)
})

test("readiness requires 200 and is separate from proof requests", () => {
  assert.match(runner, /\[ "\$code" = 200 \].*READY=YES/)
  assert.ok(runner.indexOf("READINESS=PASS") < runner.indexOf("EMPLOYEE=$(postgrest_embed_probe"))
})

test("executes each positive embedding once and requires PASS", () => {
  assert.equal((runner.match(/EMPLOYEE=\$\(postgrest_embed_probe/g) ?? []).length, 1)
  assert.equal((runner.match(/EVALUATOR=\$\(postgrest_embed_probe/g) ?? []).length, 1)
  assert.match(runner, /\[ "\$EMPLOYEE" = PASS \] && \[ "\$EVALUATOR" = PASS \]/)
})

test("requires the nonexistent-FK control to produce PGRST200", () => {
  assert.equal((runner.match(/NEGATIVE=\$\(postgrest_embed_probe/g) ?? []).length, 1)
  assert.match(runner, /POSTGREST_ERROR_PGRST200/)
})

test("shared classifier rejects connection, non-loopback, auth and ambiguity failures", () => {
  for (const verdict of ["CONNECTION_FAILED", "NON_LOOPBACK_TARGET", "MISSING_CREDENTIAL", "PGRST201_AMBIGUOUS", "HTTP_"]) {
    assert.match(probe, new RegExp(verdict))
  }
})

test("direct and gateway routes share one HTTP classifier", () => {
  assert.match(probe, /gateway\) base=.*\/rest\/v1/)
  assert.match(probe, /direct\)  base=/)
  assert.equal((probe.match(/postgrest_embed_probe\(\)/g) ?? []).length, 1)
})

test("teardown revokes every grant and membership before dropping the role", () => {
  for (const fragment of [
    "revoke f_db1b_postgrest_verifier from authenticator",
    "revoke all privileges on public.assessment_responses",
    "revoke all privileges on public.people",
    "revoke all privileges on schema public",
    "drop role f_db1b_postgrest_verifier",
  ]) assert.match(runner, new RegExp(fragment))
})

test("signals, fingerprints and resource absence are terminal gates", () => {
  assert.match(runner, /trap cleanup EXIT INT TERM HUP/)
  assert.match(runner, /DISPOSABLE_PRE.*DISPOSABLE_POST/s)
  assert.match(runner, /canonical_fingerprint_match=/)
  assert.match(runner, /residual_resources=/)
})

test("failure evidence is preserved and success secrets are destroyed", () => {
  assert.match(runner, /say "EVIDENCE=\$WORK"/)
  assert.match(runner, /rm -f "\$PROOF_KEY_FILE" "\$CONFIG_FILE"/)
})
