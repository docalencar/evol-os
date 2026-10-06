import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"

const runner = readFileSync("scripts/review/promote-t-db2-turnover.sh", "utf8")
const pre = readFileSync("scripts/review/verify-t-db2-turnover-pre.sh", "utf8")
const post = readFileSync("scripts/review/verify-t-db2-turnover-post.sh", "utf8")
const gate = readFileSync("scripts/review/run-t-db2-local-promotion-gate.sh", "utf8")
const parser = "scripts/review/parse-t-db2-pending-set.sh"
const executable = value => value.split("\n").filter(line => !/^\s*#/.test(line)).join("\n")

test("runner pins canonical Review and exact published 0142 identity", () => {
  assert.match(runner, /REVIEW_REF="rwfvxvbzaosgcyfxdjpt"/)
  assert.match(runner, /PRODUCTION_REF="gzrrwyiqfbnyprkdeqvm"/)
  assert.match(runner, /LEGACY_REF="oudngmrdtgengilpqqnz"/)
  assert.match(runner, /SOURCE_COMMIT="67843339d292e659a791d7efcc6a62f7ced61612"/)
  assert.match(runner, /MIGRATION_SHA="17a8d02f8fdf915122d68666ca8714ba5ba2ea62ebebd759b9a81e32b558a4c9"/)
  assert.match(runner, /EXPECTED_PENDING="0142_create_company_turnover_boundary.sql"/)
})

test("runner has one mutation command and fail-closed ambiguous outcome", () => {
  const code = executable(runner)
  assert.equal((code.match(/supabase db push[^\n]*--linked --yes/g) ?? []).length, 1)
  assert.match(code, /UNKNOWN_REMOTE_OUTCOME_INSPECT_BEFORE_RETRY/)
  assert.equal(/migration repair|migration up|psql[^\n]*-f "\$MIGRATION"/.test(code), false)
  assert.equal(/--db-url|SUPABASE_DB_URL/.test(code), false)
  assert.match(code, /SUPABASE_DB_PASSWORD="\$P_PASS"/)
})

test("target and canonical tooling guards precede credentialed mutation", () => {
  assert.match(runner, /security find-generic-password/)
  assert.match(runner, /NOT_ATTEMPTED_FORBIDDEN_TARGET/)
  assert.match(runner, /PROJECT_REF_MATCH=true/)
  assert.match(runner, /tooling is not canonical origin\/main/)
  assert.equal(/say\s+["'][^"']*\$(URL|P_PASS|PGPASSWORD)/.test(executable(runner)), false)
})

test("PRE is read-only and pins empty 0142 object surface", () => {
  assert.match(pre, /set default_transaction_read_only = on;/)
  for (const label of ["MIGRATION_0142_COUNT", "TURNOVER_TABLE_COUNT", "TURNOVER_NAME_COUNT", "TURNOVER_TRIGGER_COUNT", "PEOPLE_POLICY_FINGERPRINT", "PEOPLE_ACL_FINGERPRINT", "ADMIN_AUDIT_FINGERPRINT"]) assert.match(pre, new RegExp(label))
  assert.match(runner, /MIGRATION_0142_COUNT=0/)
  assert.match(runner, /TURNOVER_TABLE_COUNT=0/)
})

test("POST proves ledger, boundary, closed ACL, no backfill and preserved People contract", () => {
  for (const assertion of [
    /expect MIGRATION_0142_COUNT 1/,
    /expect MIGRATIONS_AFTER_0142 0/,
    /expect TURNOVER_TABLE_ROWS 0/,
    /expect TURNOVER_TABLE_RLS true/,
    /expect TURNOVER_CLIENT_TABLE_PRIV_COUNT 0/,
    /expect TURNOVER_AUTH_EXECUTE 1/,
    /expect TURNOVER_FORBIDDEN_EXECUTE_COUNT 0/,
    /expect TURNOVER_HELPER_CLIENT_EXECUTE_COUNT 0/,
    /expect PEOPLE_CLIENT_DML_COUNT "\$PRE_PEOPLE_CLIENT_DML_COUNT"/,
    /expect PEOPLE_POLICY_FINGERPRINT "\$PRE_PEOPLE_POLICY_FINGERPRINT"/,
  ]) assert.match(post, assertion)
})

test("local gate is loopback-only, creates exact pre-state and never accesses Review", () => {
  assert.match(gate, /this gate runs against the LOCAL database only/)
  assert.match(gate, /REVIEW_ACCESSED=NO/)
  assert.equal(/security|pooler\.supabase\.com/.test(executable(gate)), false)
  assert.match(gate, /bash "\$PRE"/)
  assert.match(gate, /bash "\$POST"/)
  assert.match(gate, /-f "\$MIGRATION"/)
})

const parse = ({ stdout = "", stderr = "", status = 0, expected = "0142_create_company_turnover_boundary.sql" }) => {
  const dir = mkdtempSync(join(tmpdir(), "tdb2-parser-"))
  const out = join(dir, "stdout"); const err = join(dir, "stderr")
  writeFileSync(out, stdout); writeFileSync(err, stderr)
  return spawnSync("bash", [parser, expected, String(status), out, err], { encoding: "utf8" })
}

test("parser accepts exact 0142 from stdout, stderr, or combined real CLI output", () => {
  assert.equal(parse({ stdout: '{"migrations":["0142_create_company_turnover_boundary.sql"]}' }).status, 0)
  assert.equal(parse({ stderr: "Would push these migrations:\n • 0142_create_company_turnover_boundary.sql\n" }).status, 0)
  assert.equal(parse({ stdout: '{"migrations":["0142_create_company_turnover_boundary.sql"]}', stderr: "Would push these migrations:\n • 0142_create_company_turnover_boundary.sql\n" }).status, 0)
})

test("parser rejects the observed unlinked JSON error, empty, extra and non-zero results", () => {
  assert.notEqual(parse({ stdout: '{"error":{"code":"LegacyProjectNotLinkedError","message":"Cannot find project ref."}}', status: 1 }).status, 0)
  assert.notEqual(parse({}).status, 0)
  assert.notEqual(parse({ stdout: '{"migrations":["0142_create_company_turnover_boundary.sql","0143_extra.sql"]}' }).status, 0)
  assert.notEqual(parse({ stdout: '{"migrations":["0142_create_company_turnover_boundary.sql"]}', status: 1 }).status, 0)
})

test("runner preserves dry-run stdout, stderr and exit status evidence", () => {
  assert.match(runner, /DRY_OUT=.*DRY_ERR=.*DRY_STATUS=/)
  assert.match(runner, /printf '%s\\n' "\$DRY_EXIT" >"\$DRY_STATUS"/)
  assert.match(runner, /DRY_OUT=\$DRY_OUT DRY_ERR=\$DRY_ERR DRY_STATUS=\$DRY_STATUS/)
  assert.equal(/: >"\$DRY_(OUT|ERR|STATUS)"/.test(runner), false)
})
