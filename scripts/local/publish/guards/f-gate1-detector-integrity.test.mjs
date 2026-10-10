/**
 * Regression suite for the Foundation publication guard.
 *
 * WHY IT EXISTS
 *
 * The guard had NO automated test. It was mutation-audited by hand once, and then
 * it refused a legitimate candidate: written for F-DB1b, it demanded the
 * candidate's migration scope equal exactly 0144, so F-DB1c's 0145 failed. A
 * hand audit proves a guard works the day it is written; it does not keep
 * proving it.
 *
 * Generalising to an allow-list is the kind of change that can silently become a
 * bypass, so the negatives below matter more than the positives: each asserts the
 * guard still REFUSES something it must refuse. They run the real guard against
 * temporary clones of the real files, and restore them afterwards.
 */

import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { copyFileSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const REPO = resolve(import.meta.dirname, "../../../..")
const GUARD = "scripts/local/publish/guards/f-gate1-detector-integrity.sh"
const RUNNER = resolve(REPO, "scripts/local/verify-f-gate1-foundation-sweeps.sh")
const M0144 = resolve(REPO, "supabase/migrations/0144_harden_assessment_execution_tenant_fks.sql")
const M0145 = resolve(REPO, "supabase/migrations/0145_harden_assessment_lifecycle_tenant_fks.sql")
const M0146 = resolve(REPO, "supabase/migrations/0146_harden_feedback_attachment_mention_tenant_fks.sql")
const BASE = "84af9a40f528d978c51db565d06e2c2f8331e8a5"

/** Run the real guard with the publication environment the gate supplies. */
function runGuard({ base = BASE, candidate = "HEAD" } = {}) {
  return new Promise((done) => {
    execFile("bash", [GUARD], {
      cwd: REPO,
      env: { ...process.env, PUBLISH_BASE: base, PUBLISH_CANDIDATE: candidate },
      timeout: 60_000,
    }, (error, stdout, stderr) => done({ code: error?.code ?? 0, out: `${stdout}${stderr}` }))
  })
}

/** Temporarily replace a file's contents, run fn, then restore it byte-for-byte. */
async function withMutation(path, mutate, fn) {
  const original = readFileSync(path)
  try {
    writeFileSync(path, mutate(original.toString()))
    return await fn()
  } finally {
    writeFileSync(path, original)
  }
}

// ---------------------------------------------------------------------------
// POSITIVE
// ---------------------------------------------------------------------------

test("the real workspace passes: 0146 authorized, baseline 24, F-DB1d cited", async () => {
  const { code, out } = await runGuard()
  assert.match(out, /0144_harden_assessment_execution_tenant_fks\.sql matches its reviewed SHA256/)
  assert.match(out, /0145_harden_assessment_lifecycle_tenant_fks\.sql matches its reviewed SHA256/)
  assert.match(out, /0146_harden_feedback_attachment_mention_tenant_fks\.sql matches its reviewed SHA256/)
  assert.match(out, /candidate migrations are all authorized/)
  assert.match(out, /pins BASELINE_OFFENDERS=24 and cites F-DB1d/)
  assert.match(out, /nulls only the uploader column/)
  assert.match(out, /F_GATE1_DETECTOR_INTEGRITY=PASS/)
  assert.equal(code, 0)
})

test("earlier migrations stay pinned — each new slice ADDS to the allow-list", async () => {
  const guard = readFileSync(resolve(REPO, GUARD), "utf8")
  assert.match(guard, /0144_harden_assessment_execution_tenant_fks\.sql:b9289408e100/)
  assert.match(guard, /0145_harden_assessment_lifecycle_tenant_fks\.sql:a267ec22eadc795c/)
  assert.match(guard, /0146_harden_feedback_attachment_mention_tenant_fks\.sql:684501087acd/)
})

// ---------------------------------------------------------------------------
// NEGATIVE — each must FAIL
// ---------------------------------------------------------------------------

test("1. a migration outside the allow-list fails — real history, 0143", async () => {
  // The guard reads `git diff base..candidate`, so an untracked file can never
  // appear there. The first version of this test wrote 0146 to disk and asserted
  // a failure that could not happen — it tested nothing. Use a real commit pair
  // whose diff genuinely carries a migration the allow-list does not name.
  const { code, out } = await runGuard({
    base: "c90581b9785be050ab41d51e9e10c9fe6a3dcac2",
    candidate: "c625f24ef6351cfd7f87d75dc78c5b07f88aa3b0",
  })
  assert.match(out, /unauthorized migration\(s\):.*0143_enforce_assessment_answers_company_id_not_null\.sql/)
  assert.equal(code, 1)
})

test("2. a changed 0144 payload fails", async () => {
  const { code, out } = await withMutation(M0144, (s) => `${s}\n-- tamper\n`, runGuard)
  assert.match(out, /0144_harden_assessment_execution_tenant_fks\.sql does not match its reviewed SHA256/)
  assert.equal(code, 1)
})

test("3a. a changed 0146 payload fails", async () => {
  const { code, out } = await withMutation(M0146, (s) => `${s}\n-- tamper\n`, runGuard)
  assert.match(out, /0146_harden_feedback_attachment_mention_tenant_fks\.sql does not match its reviewed SHA256/)
  assert.equal(code, 1)
})

test("3b. losing the SET NULL column list fails — it is valid SQL that breaks only at DELETE time", async () => {
  const { code, out } = await withMutation(
    M0146, (s) => s.replace(/on delete set null \(uploaded_by_employee_id\)/, "on delete set null"), runGuard)
  assert.match(out, /lost its SET NULL column list|bare SET NULL/)
  assert.equal(code, 1)
})

test("3. a changed 0145 payload fails", async () => {
  const { code, out } = await withMutation(M0145, (s) => `${s}\n-- tamper\n`, runGuard)
  assert.match(out, /0145_harden_assessment_lifecycle_tenant_fks\.sql does not match its reviewed SHA256/)
  assert.equal(code, 1)
})

test("4. touching an earlier migration fails", async () => {
  const path = resolve(REPO, "supabase/migrations/0142_create_company_turnover_boundary.sql")
  const original = readFileSync(path)
  try {
    writeFileSync(path, `${original.toString()}\n-- tamper\n`)
    const { code, out } = await runGuard({ base: "4b825dc642cb6eb9a060e54bf8d69288fbee4904" })
    assert.match(out, /unauthorized migration\(s\):.*0142_create_company_turnover_boundary\.sql/)
    assert.equal(code, 1)
  } finally { writeFileSync(path, original) }
})

test("5. an empty migration scope fails — the allow-list is not 'anything goes'", async () => {
  // base == candidate yields no changed migrations at all.
  const { code, out } = await runGuard({ base: "HEAD", candidate: "HEAD" })
  assert.match(out, /declares a migration slice but changes no migration/)
  assert.equal(code, 1)
})

test("6. baseline 24 without provenance fails", async () => {
  const { code, out } = await withMutation(RUNNER, (s) => s.replace(/F-DB1d: 30 -> 24/, "moved"), runGuard)
  assert.match(out, /does not pin 24 with F-DB1d provenance/)
  assert.equal(code, 1)
})

test("7. a candidate carrying 0146 but still pinning 30 fails", async () => {
  const { code, out } = await withMutation(
    RUNNER, (s) => s.replace(/^readonly BASELINE_OFFENDERS=24$/m, "readonly BASELINE_OFFENDERS=30"), runGuard)
  assert.match(out, /carries 0146 but the runner does not pin 24/)
  assert.equal(code, 1)
})

test("8. baseline 24 WITHOUT a candidate carrying 0146 fails — the window is impossible", async () => {
  // base == candidate: no 0146 in scope, yet the runner pins 24.
  const { code, out } = await runGuard({ base: "HEAD", candidate: "HEAD" })
  assert.match(out, /pins 24 without a candidate that carries 0146|declares a migration slice but changes no migration/)
  assert.equal(code, 1)
})

test("9. returning a red sweep to supabase/tests fails", async () => {
  const stray = resolve(REPO, "supabase/tests/adr_0012_tenant_owned_fk_sweep.test.sql")
  copyFileSync(resolve(REPO, "supabase/gates/adr_0012_tenant_owned_fk_sweep.sql"), stray)
  try {
    const { code, out } = await runGuard()
    assert.match(out, /red-by-design sweep is inside supabase\/tests/)
    assert.equal(code, 1)
  } finally { rmSync(stray) }
})

test("10. shrinking the expected constraint set fails", async () => {
  const sweep = resolve(REPO, "supabase/gates/adr_0012_tenant_owned_fk_sweep.sql")
  const { code, out } = await withMutation(
    sweep, (s) => s.replace("'position_requirements_position_company_fkey',", ""), runGuard)
  assert.match(out, /expected set contains 29 distinct names, not 30/)
  assert.equal(code, 1)
})

test("11. a missing authorized migration fails rather than passing vacuously", async () => {
  const away = `${M0145}.away`
  renameSync(M0145, away)
  try {
    const { code, out } = await runGuard()
    assert.match(out, /an authorized migration is missing/)
    assert.equal(code, 1)
  } finally { renameSync(away, M0145) }
})
