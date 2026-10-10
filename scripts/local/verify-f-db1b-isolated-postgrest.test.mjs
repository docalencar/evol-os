import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const runner = readFileSync(resolve(import.meta.dirname, "verify-f-db1b-isolated-postgrest.sh"), "utf8")
const probe = readFileSync(resolve(import.meta.dirname, "lib/postgrest-embed-probe.sh"), "utf8")
const feedbackSchema = readFileSync(
  resolve(import.meta.dirname, "../../supabase/migrations/0043_create_feedback_conversation_foundation.sql"), "utf8")

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
    // The FK column of every probed embed must be readable, or PostgREST answers 403.
  assert.match(runner, /grant select \(id,assessment_cycle_id,employee_id,evaluator_id,company_id\) on public\.assessment_responses/)
  // Least privilege is still the contract: column-scoped, never table-wide.
  assert.doesNotMatch(runner, /grant select on public\.(assessment_responses|assessment_answers|assessment_cycles|people)\b/)
  assert.match(runner, /grant select \(id,company_id\) on public\.people/)
  for (const fn of ["is_company_member", "current_person_id", "has_company_role"]) {
    assert.match(runner, new RegExp(`grant execute on function public\\.${fn}`))
  }
  assert.doesNotMatch(runner, /service_role/i)
  assert.doesNotMatch(runner, /disable row level security/i)
})

test("expired and future JWTs have distinct factual assertions", () => {
  assert.match(runner, /EXPIRED_HTTP.*PGRST303.*JWT expired/s)
  assert.match(runner, /FUTURE_HTTP.*PGRST303.*JWT issued at future/s)
  assert.match(runner, /JWT_NEGATIVE_TESTS=PASS/)
})

test("valid authentication is mandatory before the first embedding", () => {
  assert.match(runner, /VALID_HTTP.*= 200/s)
  assert.match(runner, /JWT_POSITIVE_TEST=PASS/)
  assert.ok(runner.indexOf("READINESS=PASS") < runner.indexOf("VERIFIER_KEY=$(make_jwt valid)"))
  assert.ok(runner.indexOf("JWT_POSITIVE_TEST=PASS") < runner.indexOf("FIRST=$(postgrest_embed_probe"))
})

test("JWT time comes from the container and clock skew fails closed as environmental", () => {
  assert.match(runner, /CONTAINER_NOW=\$\(docker exec "\$DB_CONTAINER" date -u \+%s\)/)
  assert.match(runner, /CLOCK_SKEW.*-gt 60/)
  assert.match(runner, /FAILURE_CLASS=ENVIRONMENTAL/)
  assert.match(runner, /stop "CLOCK_SKEW"/)
  assert.match(runner, /exp:now\+900/)
})

function jwtContract(source) {
  return /VALID_HTTP.*= 200/s.test(source)
    && /EXPIRED_HTTP.*PGRST303.*JWT expired/s.test(source)
    && /FUTURE_HTTP.*PGRST303.*JWT issued at future/s.test(source)
    && source.indexOf("JWT_POSITIVE_TEST=PASS") < source.indexOf("FIRST=$(postgrest_embed_probe")
}

test("sabotage proves positive auth, factual messages and execution order are required", () => {
  assert.equal(jwtContract(runner), true)
  for (const sabotaged of [
    runner.replace('[ "$VALID_HTTP" = 200 ]', '[ "$VALID_HTTP" = 401 ]'),
    runner.replace('"message":"JWT expired', '"message":"anything'),
    runner.replace('"message":"JWT issued at future', '"message":"anything'),
    runner.replace('say "JWT_POSITIVE_TEST=PASS"', 'FIRST=$(postgrest_embed_probe); say "JWT_POSITIVE_TEST=PASS"'),
  ]) assert.equal(jwtContract(sabotaged), false)
})

test("credentials stay out of curl argv and temporary files are protected", () => {
  assert.match(runner, /chmod 700 "\$WORK"/)
  assert.match(runner, /chmod 600 "\$PROOF_KEY_FILE"/)
  assert.match(probe, /curl -K -/)
  assert.doesNotMatch(probe, /curl .*Bearer/)
})

test("readiness requires 200 and is separate from proof requests", () => {
  assert.match(runner, /\[ "\$code" = 200 \].*READY=YES/)
  assert.ok(runner.indexOf("READINESS=PASS") < runner.indexOf("FIRST=$(postgrest_embed_probe"))
})

// The expected count is DERIVED from the declared modes, not hard-coded. The
// first version asserted `2` and went red when a third mode was added — it was
// measuring the number of modes while claiming to measure "once per mode", so a
// new mode that forgot its probe would have looked identical to this failure.
const MODE_COUNT = (runner.match(/^\s{2}f_db1[a-z]\)$/gm) ?? []).length

test("every declared proof mode has its own probe invocations", () => {
  assert.ok(MODE_COUNT >= 2, `expected at least two modes, found ${MODE_COUNT}`)
  assert.equal((runner.match(/FIRST=\$\(postgrest_embed_probe/g) ?? []).length, MODE_COUNT)
  assert.equal((runner.match(/SECOND=\$\(postgrest_embed_probe/g) ?? []).length, MODE_COUNT)
  assert.match(runner, /\[ "\$FIRST" = PASS \] && \[ "\$SECOND" = PASS \]/)
})

test("a mode with more than two relationships requires every one of them to PASS", () => {
  // f_db1d probes six relationships. Proving two of six would leave four
  // embeddings unmeasured while reporting PASS.
  assert.match(runner, /THIRD=\$\(postgrest_embed_probe/)
  assert.match(runner, /for V in "\$THIRD" "\$FOURTH" "\$FIFTH" "\$SIXTH"/)
  assert.match(runner, /\[ "\$V" = PASS \] \|\| stop/)
})

test("requires the nonexistent-FK control to produce PGRST200", () => {
  assert.equal((runner.match(/NEGATIVE=\$\(postgrest_embed_probe/g) ?? []).length, MODE_COUNT)
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

test("F-DB1c mode proves both lifecycle resources without changing F-DB1b defaults", () => {
  assert.match(runner, /MODE=\$\{F_DB1C_MODE:-f_db1b\}/)
  assert.match(runner, /assessment_cycles!assessment_responses_assessment_cycle_id_fkey/)
  assert.match(runner, /assessment_responses!assessment_answers_assessment_response_id_fkey/)
  assert.match(runner, /direct assessment_answers/)
  assert.match(runner, /POSTGREST_ERROR_PGRST200/)
})


// ---------------------------------------------------------------------------
// Transitive policy columns — the defect that produced six HTTP 403s.
//
// The f_db1d grants first covered only the FK columns of the probed
// relationships. But a SELECT on feedback_attachments runs that table's policy,
// which consults feedback_threads, which runs ITS policy, which reads
// feedback_threads.sender_employee_id / .receiver_employee_id and
// people.manager_id. Column privileges apply inside policy expressions, so a
// missing one raises 42501 -> HTTP 403 before the embedding is resolved.
//
// The required set is DERIVED from the migration that creates the policies, not
// hard-coded here: a policy that grows a new column reference must fail this
// test instead of failing as a 403 on the next Mac run.
// ---------------------------------------------------------------------------

/** The SELECT policy body for a table, read from the Feedback foundation migration. */
function selectPolicyBody(table) {
  const re = new RegExp(`create policy[^;]*?on public\\.${table}\\s+for select[^;]*;`, "is")
  const m = feedbackSchema.match(re)
  assert.ok(m, `no SELECT policy found for ${table}`)
  return m[0]
}

/** Columns the runner grants on a table, from the f_db1d grant block. */
function grantedColumns(table) {
  const m = runner.match(new RegExp(`grant select \\(([^)]*)\\) on public\\.${table} to`, "g")) ?? []
  const cols = new Set()
  for (const g of m) for (const c of g.match(/\(([^)]*)\)/)[1].split(",")) cols.add(c.trim())
  return cols
}

// Resolving an embed selects FROM the target table, so the TARGETS' policies run
// too. Measuring only the queried children is what made the first fix
// incomplete: feedback_messages' policy inlines the management branch that the
// children's policies stop short of.
const PROBED = ["feedback_attachments", "feedback_mentions"]
const TARGETS = ["feedback_threads", "feedback_messages", "people"]

test("the probed tables AND the embed targets consult feedback_threads — so its policy columns matter", () => {
  for (const t of [...PROBED, "feedback_messages"]) {
    assert.match(selectPolicyBody(t), /feedback_threads/,
      `${t}'s policy no longer consults feedback_threads; revisit the grant derivation`)
  }
})

test("every feedback_threads column read by ANY probed table or embed target is granted", () => {
  // Derived, not enumerated: the union over the policies that actually run.
  const columns = ["sender_employee_id", "receiver_employee_id", "visibility", "company_id", "id"]
  const granted = grantedColumns("feedback_threads")
  const required = new Set()
  for (const t of [...PROBED, "feedback_messages", "feedback_threads"]) {
    const body = selectPolicyBody(t)
    for (const c of columns) if (new RegExp(`\\b${c}\\b`).test(body)) required.add(c)
  }
  assert.ok(required.has("visibility"),
    "expected some policy in the probe path to read feedback_threads.visibility")
  for (const c of required) {
    assert.ok(granted.has(c),
      `feedback_threads.${c} is read by a policy in the probe path but not granted — this is the 403`)
  }
})

test("each embed target is itself readable: a target's own policy must not deny it", () => {
  // The target tables are selected when the relationship is resolved, so each one
  // needs the columns its own policy reads, not just its FK columns.
  for (const t of TARGETS) {
    const granted = grantedColumns(t)
    assert.ok(granted.has("id") && granted.has("company_id"),
      `${t} must expose id and company_id to resolve an embedding`)
  }
  assert.ok(grantedColumns("people").has("manager_id"))
  assert.ok(grantedColumns("feedback_threads").has("visibility"))
})

test("every column feedback_threads' policy reads from itself is granted", () => {
  const body = selectPolicyBody("feedback_threads")
  const granted = grantedColumns("feedback_threads")
  // Columns of feedback_threads that the policy compares or filters on.
  for (const col of ["sender_employee_id", "receiver_employee_id"]) {
    assert.match(body, new RegExp(col), `expected feedback_threads' policy to read ${col}`)
    assert.ok(granted.has(col),
      `feedback_threads.${col} is read by its own policy but not granted — this is the 403`)
  }
  assert.ok(granted.has("id") && granted.has("company_id"), "the FK columns must stay granted")
})

test("people.manager_id, reached one level deeper, is granted", () => {
  const body = selectPolicyBody("feedback_threads")
  assert.match(body, /manager_id/, "expected the management branch to read people.manager_id")
  assert.ok(grantedColumns("people").has("manager_id"),
    "people.manager_id is read through feedback_threads' policy but not granted")
})

test("the fix stays column-scoped: no table-wide grant appears anywhere", () => {
  // `grant select on <table>` without a column list is the regression to forbid.
  assert.equal((runner.match(/grant select on public\./g) ?? []).length, 0)
  assert.match(runner, /a table-wide SELECT was granted on a Feedback table/)
  assert.match(runner, /nobypassrls/)
})

test("every table the f_db1d block grants is revoked in both teardown paths", () => {
  const tables = ["feedback_attachments", "feedback_mentions", "feedback_threads", "feedback_messages"]
  for (const t of tables) {
    assert.equal((runner.match(new RegExp(`revoke all privileges on public\\.${t} from`, "g")) ?? []).length, 2,
      `${t} must be revoked in the trap path and the explicit path`)
  }
})

test("the earlier modes keep their own grant surface", () => {
  // f_db1b and f_db1c must not inherit the Feedback grants: those live in a
  // block gated on MODE, after the shared heredoc.
  assert.match(runner, /if \[ "\$MODE" = f_db1d \]; then/)
  assert.ok(runner.indexOf("grant f_db1b_postgrest_verifier to authenticator;")
    < runner.indexOf("on public.feedback_attachments to f_db1b_postgrest_verifier"))
  for (const m of ["f_db1b", "f_db1c"]) assert.match(runner, new RegExp(`^  ${m}\\)$`, "m"))
})
