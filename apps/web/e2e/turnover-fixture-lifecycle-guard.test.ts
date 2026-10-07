import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const root = resolve(import.meta.dirname, "../../..")
const lifecycle = readFileSync(resolve(import.meta.dirname, "turnover-fixture/lifecycle.ts"), "utf8")
const store = readFileSync(resolve(import.meta.dirname, "turnover-fixture/journal-store.ts"), "utf8")
const contract = readFileSync(resolve(root, "docs/Execution/T-E2E0A-DURABLE-TURNOVER-FIXTURE-LIFECYCLE.md"), "utf8")
const migration = readFileSync(resolve(root, "supabase/migrations/0142_create_company_turnover_boundary.sql"), "utf8")

test("contract and lifecycle freeze the complete durable state machine", () => {
  for (const state of ["PLANNED", "BOOTSTRAPPED", "COVERAGE_STARTED", "MTD_ELIGIBLE", "CLOSED_PERIOD_ELIGIBLE", "POSITIVE_FACT_READY", "HOSTED_PROVEN", "RETIRED"]) {
    assert.match(contract, new RegExp(`\\b${state}\\b`))
    assert.match(lifecycle, new RegExp(`"${state}"`))
  }
})

test("tooling is purpose-bound, Review-only and rejects Production and Legacy", () => {
  assert.match(lifecycle, /evol-turnover-durable-fixture-v1/)
  assert.match(lifecycle, /rwfvxvbzaosgcyfxdjpt/)
  assert.match(lifecycle, /gzrrwyiqfbnyprkdeqvm/)
  assert.match(lifecycle, /oudngmrdtgengilpqqnz/)
  assert.doesNotMatch(lifecycle, /executive|Executive/)
})

test("no secret, accumulator write, backfill, local formula or direct People mutation exists", () => {
  const combined = `${lifecycle}\n${contract}`
  assert.doesNotMatch(combined, /service[_ ]?role[_ ]?key|anon[_ ]?key|password\s*:/i)
  assert.doesNotMatch(lifecycle, /company_turnover_monthly_facts|\.from\(["']people["']\)|insert\(|update\(|delete\(/)
  assert.doesNotMatch(lifecycle, /canonical_terminations\s*\/|turnover_percent\s*=|\*\s*100/)
  assert.match(contract, /no direct write/i)
  assert.match(contract, /no backfill/i)
})

test("0142 proves rollover needs observation and remains byte-separate from tooling", () => {
  assert.match(migration, /perform public\.ensure_company_turnover_period_v1\(p_company_id, v_generated_at\)/)
  assert.match(migration, /execute function public\.capture_company_turnover_people_delta_v1\(\)/)
  assert.match(migration, /while v_latest\.period_start < v_current_start loop/)
  assert.match(contract, /Time passing does not write database state/)
  assert.match(contract, /authorized read through `get_company_turnover_v1`/)
})

test("single fixture, ownership-before-mutation and retirement safety are explicit", () => {
  assert.match(contract, /Exactly one journal and one company/)
  assert.match(contract, /recorded by full UUID\s+before any later mutation/)
  assert.match(lifecycle, /MUTATION_TARGET_NOT_OWNED/)
  assert.match(lifecycle, /HOSTED_PROOF_PREMATURE/)
  assert.match(lifecycle, /RETIREMENT_PREMATURE/)
  assert.match(contract, /zero automatic retry/)
  assert.match(contract, /Failure\s+consumes the run/)
  assert.match(store, /flag: "wx"/)
  assert.match(store, /mode: 0o600/)
  assert.match(store, /JOURNAL_REVISION_CONFLICT/)
  assert.match(store, /renameSync\(temporary, path\)/)
})
