/**
 * Reconciliation is the only place the harness DISCOVERS a deletion target
 * instead of being told about one, so its refusals matter more than its
 * successes. These tests pin every path where it must decline to act.
 *
 * The classifier is pure, so no control plane and no run state are involved —
 * but the run directory is redirected anyway, on principle: no test in this
 * repository may be able to resolve operational state.
 */

import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

const TEST_RUN_DIR = mkdtempSync(resolve(tmpdir(), "evol-e2e-reconcile-"))
process.env.E2E_RUN_DIR = TEST_RUN_DIR

// Static import, deliberately. There is no `"type": "module"` in this workspace,
// so tsx transpiles to CommonJS and a top-level `await import()` is a hard syntax
// error — the same trap that `import.meta` sprang earlier in this harness. The
// assignment above still runs first because CJS `require` calls keep statement
// order, and `runDir()` reads the variable lazily in any case.
import { classifyOwnershipRows } from "./tenant-fixture"

const KNOWN_COMPANY = "11111111-1111-4111-8111-111111111111"
const NEW_COMPANY = "22222222-2222-4222-8222-222222222222"
const OTHER_COMPANY = "33333333-3333-4333-8333-333333333333"
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

test("adopts the one company a journalled user created through the UI", () => {
  const verdict = classifyOwnershipRows(
    [
      { company_id: KNOWN_COMPANY, user_id: USER_A },
      { company_id: NEW_COMPANY, user_id: USER_B },
    ],
    [KNOWN_COMPANY],
  )

  assert.equal(verdict.status, "ok")
  assert.deepEqual((verdict as { adopted: string[] }).adopted, [NEW_COMPANY])
})

test("adopts nothing when every owned company is already journalled", () => {
  const verdict = classifyOwnershipRows(
    [{ company_id: KNOWN_COMPANY, user_id: USER_A }],
    [KNOWN_COMPANY],
  )

  assert.equal(verdict.status, "ok")
  assert.deepEqual((verdict as { adopted: string[] }).adopted, [])
})

test("two users each owning one new company is not ambiguous", () => {
  const verdict = classifyOwnershipRows(
    [
      { company_id: NEW_COMPANY, user_id: USER_A },
      { company_id: OTHER_COMPANY, user_id: USER_B },
    ],
    [],
  )

  assert.equal(verdict.status, "ok")
  assert.deepEqual(
    [...(verdict as { adopted: string[] }).adopted].sort(),
    [NEW_COMPANY, OTHER_COMPANY].sort(),
  )
})

test("FAILS CLOSED when one user owns two unjournalled companies", () => {
  // create_company_with_owner raises USER_ALREADY_HAS_COMPANY for a caller with an
  // active membership, so one identity can own at most one company. Two means the
  // model is wrong, and guessing which to delete is exactly what must not happen.
  const verdict = classifyOwnershipRows(
    [
      { company_id: NEW_COMPANY, user_id: USER_A },
      { company_id: OTHER_COMPANY, user_id: USER_A },
    ],
    [],
  )

  assert.equal(verdict.status, "ambiguous")
  assert.equal((verdict as { userId: string }).userId, USER_A)
  assert.deepEqual(
    (verdict as { candidates: string[] }).candidates,
    [NEW_COMPANY, OTHER_COMPANY].sort(),
  )
})

test("FAILS CLOSED on a truncated company id rather than completing it", () => {
  const verdict = classifyOwnershipRows(
    [{ company_id: "22222222-2222", user_id: USER_A }],
    [],
  )

  assert.equal(verdict.status, "unusable")
  assert.match((verdict as { reason: string }).reason, /company_id .* not a complete UUID/)
})

test("FAILS CLOSED on a malformed user id", () => {
  const verdict = classifyOwnershipRows(
    [{ company_id: NEW_COMPANY, user_id: 42 }],
    [],
  )

  assert.equal(verdict.status, "unusable")
  assert.match((verdict as { reason: string }).reason, /user_id .* not a complete UUID/)
})

test("a duplicate row for the same user and company is not mistaken for ambiguity", () => {
  const verdict = classifyOwnershipRows(
    [
      { company_id: NEW_COMPANY, user_id: USER_A },
      { company_id: NEW_COMPANY, user_id: USER_A },
    ],
    [],
  )

  assert.equal(verdict.status, "ok")
  assert.deepEqual((verdict as { adopted: string[] }).adopted, [NEW_COMPANY])
})

test.after(() => {
  rmSync(TEST_RUN_DIR, { recursive: true, force: true })
})
