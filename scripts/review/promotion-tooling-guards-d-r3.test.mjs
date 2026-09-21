import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const runner = readFileSync("scripts/review/promote-d-r3-ledger-closure.sh", "utf8")
const pre = readFileSync("scripts/review/verify-d-r3-ledger-closure-pre.sh", "utf8")
const post = readFileSync("scripts/review/verify-d-r3-ledger-closure-post.sh", "utf8")
const gate = readFileSync("scripts/review/run-d-r3-local-db-gate.sh", "utf8")
const executable = value => value.split("\n").filter(line => !/^\s*#/.test(line)).join("\n")

test("runner pins canonical Review and the exact 0134 identity", () => {
  assert.match(runner, /REVIEW_REF="rwfvxvbzaosgcyfxdjpt"/)
  assert.match(runner, /SOURCE_COMMIT="31d4ac91c1d417953eeaaf3b806644b1cbf09355"/)
  assert.match(runner, /MIGRATION_SHA="2f55002c1e58843b7acc706b2e9cc5e72f37b888630fb847fff5a09c1d4363d3"/)
  assert.match(runner, /EXPECTED_PENDING="0134_close_development_ledger_direct_read.sql"/)
})

test("runner has one mutation site and explicit ambiguous-outcome handling", () => {
  const code = executable(runner)
  assert.equal((code.match(/supabase db push --yes/g) ?? []).length, 1)
  assert.equal((code.match(/supabase db push --db-url "\$URL" --yes/g) ?? []).length, 1)
  assert.match(code, /run_mutating_push <\/dev\/null/)
  assert.match(code, /UNKNOWN_REMOTE_OUTCOME_INSPECT_BEFORE_RETRY/)
  assert.equal(/migration repair|migration up|psql[^\n]*-f "\$MIGRATION"/.test(code), false)
})

test("credential is never printed or stored and target checks precede PRE", () => {
  assert.match(runner, /security find-generic-password/)
  assert.match(runner, /PROJECT_REF_MATCH=true/)
  assert.equal(/say\s+["'][^"']*\$(URL|P_PASS|PGPASSWORD)/.test(executable(runner)), false)
  assert.equal(/postgres(ql)?:\/\/[^\s"']*:[^\s"'@]+@/.test(runner), false)
})

test("PRE is read-only and POST pins closure plus preserved contracts", () => {
  assert.match(pre, /set default_transaction_read_only = on;/)
  for (const label of ["AUTH_SELECT_COUNT", "LEDGER_RLS_FINGERPRINT", "LEDGER_POLICY_FINGERPRINT", "TRUSTED_BOUNDARY_FINGERPRINT", "ORIGIN_FINGERPRINT", "RETENTION_FINGERPRINT", "RETENTION_RELATIONS"]) assert.match(pre, new RegExp(label))
  assert.match(post, /expect AUTH_SELECT_COUNT 0/)
  assert.match(post, /expect SELECT_POLICY_COUNT 4/)
  assert.match(post, /expect TRUSTED_BOUNDARY_COUNT 4/)
})

test("local gate is loopback-only and never accesses Review", () => {
  assert.match(gate, /this gate runs against the LOCAL database only/)
  assert.match(gate, /REVIEW_ACCESSED=NO/)
  assert.equal(/security|pooler\.supabase\.com/.test(executable(gate)), false)
  assert.match(gate, /bash "\$PRE"/)
  assert.match(gate, /bash "\$POST"/)
  assert.match(gate, /-f "\$MIGRATION"/)
})
