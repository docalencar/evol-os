import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const runner = readFileSync(resolve(import.meta.dirname, "bootstrap-runner.ts"), "utf8")
const adapter = readFileSync(resolve(import.meta.dirname, "canonical-adapter.ts"), "utf8")
const evidence = readFileSync(resolve(import.meta.dirname, "bootstrap-evidence.ts"), "utf8")
const combined = `${runner}\n${adapter}\n${evidence}`

test("runner is purpose-bound, Review-only and uses canonical boundaries", () => {
  assert.match(runner, /EXPECTED_LEDGER/)
  assert.match(runner, /assertPre/)
  assert.match(runner, /assertToctou/)
  assert.match(adapter, /create_company_with_owner/)
  assert.match(adapter, /create_tenant_person_v2/)
  assert.match(adapter, /get_company_turnover_v1/)
  assert.doesNotMatch(combined, /executive|Executive/)
})

test("runner contains no direct protected writes, backfill, timestamp manipulation or formula", () => {
  assert.doesNotMatch(combined, /\.from\(["']people["']\)|company_turnover_monthly_facts|insert\s+into|update\s+public\.people|coverage_started_at\s*=|backfill/i)
  assert.doesNotMatch(combined, /canonical_terminations\s*\/|turnover_percent\s*=|\*\s*100/)
})

test("evidence is fail-closed, secret-free and hosted run is absent", () => {
  assert.match(evidence, /flag: "wx"/)
  assert.match(evidence, /mode: 0o600/)
  assert.match(runner, /UNKNOWN_REMOTE_OUTCOME/)
  assert.doesNotMatch(combined, /playwright|hostedEvidenceId\s*:/i)
})
