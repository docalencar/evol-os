/**
 * Ownership must survive a crash.
 *
 * The regression this guards: the manifest was written only after the whole
 * fixture succeeded, so when person creation threw, teardown reported "no run
 * manifest" and a synthetic auth user was stranded on Review.
 */

import assert from "node:assert/strict"
import { mkdtempSync, existsSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

/**
 * Redirect run state to a throwaway directory BEFORE importing anything that
 * resolves it. An earlier revision ran these tests against the real `.run`
 * directory, and `afterEach`'s `discardJournal()` silently deleted a live
 * recovery journal. A test suite must never be able to destroy operational state.
 */
process.env.E2E_RUN_DIR = mkdtempSync(resolve(tmpdir(), "evol-e2e-journal-"))

import {
  discardJournal,
  journalPath,
  markSetupComplete,
  openJournal,
  readJournal,
  record,
  recordUser,
  setCompany,
} from "./journal"
import type { SyntheticUser } from "./run-context"

const SEED = {
  runId: "test-run",
  createdAt: "2026-09-05T00:00:00.000Z",
  baseUrl: "https://evol-os-review.vercel.app",
  supabaseRef: "rwfvxvbzaosgcyfxdjpt",
  companyId: null,
  companySlug: null,
  companyName: null,
}

function user(role: SyntheticUser["role"], id: string): SyntheticUser {
  return {
    role,
    // `admin` and `onboarding` both end up owning a tenant; the rest map through.
    membershipRole: role === "admin" || role === "onboarding" ? "owner" : role,
    email: `e2e+${id}@evol-e2e.invalid`,
    userId: id,
    personId: null,
    fullName: `E2E ${role}`,
    password: "not-a-real-password",
  }
}

test.afterEach(() => {
  discardJournal()
  const stray = `${journalPath()}.tmp`
  if (existsSync(stray)) rmSync(stray, { force: true })
})

test("these tests operate on a temporary directory, never the real run state", () => {
  const dir = process.env.E2E_RUN_DIR ?? ""
  assert.notEqual(dir, "")
  assert.equal(journalPath().startsWith(dir), true)
  assert.equal(journalPath().includes("/apps/web/e2e/.run/"), false)
})

test("the journal exists before any resource is created", () => {
  openJournal(SEED)
  const onDisk = readJournal()
  assert.ok(onDisk, "journal must be readable immediately after opening")
  assert.equal(onDisk.owned.length, 0)
  assert.equal(onDisk.setupComplete, false)
})

test("the journal is written at mode 600 — it holds synthetic passwords", () => {
  openJournal(SEED)
  assert.equal(statSync(journalPath()).mode & 0o777, 0o600)
})

test("the first auth user is journaled immediately, before the next call can fail", () => {
  const journal = openJournal(SEED)
  recordUser(journal, user("admin", "user-1"))

  const onDisk = readJournal()
  assert.equal(onDisk?.users.length, 1)
  assert.deepEqual(onDisk?.owned, [{ kind: "auth.user", id: "user-1" }])
})

test("a crash after user creation still leaves recoverable ownership", () => {
  const journal = openJournal(SEED)
  recordUser(journal, user("admin", "user-1"))
  recordUser(journal, user("manager", "user-2"))
  // …process dies here.

  const recovered = readJournal()
  assert.equal(recovered?.setupComplete, false)
  assert.deepEqual(
    recovered?.owned.map((resource) => (resource.kind === "membership" ? null : resource.id)),
    ["user-1", "user-2"],
  )
})

test("a crash after membership but before person is recoverable", () => {
  const journal = openJournal(SEED)
  recordUser(journal, user("admin", "user-1"))
  setCompany(journal, { id: "company-1", name: "E2E Review", slug: "e2e-review" })
  record(journal, { kind: "membership", companyId: "company-1", userId: "user-2" })
  // …person insert throws here, which is precisely where the real run failed.

  const recovered = readJournal()
  assert.equal(recovered?.companyId, "company-1")
  assert.equal(recovered?.setupComplete, false)
  const kinds = recovered?.owned.map((resource) => resource.kind)
  assert.deepEqual(kinds, ["auth.user", "company", "membership"])
})

test("setup completion is recorded distinctly from a crash", () => {
  const journal = openJournal(SEED)
  assert.equal(readJournal()?.setupComplete, false)
  markSetupComplete(journal)
  assert.equal(readJournal()?.setupComplete, true)
})

test("writes are atomic: no temp file is left behind", () => {
  const journal = openJournal(SEED)
  recordUser(journal, user("admin", "user-1"))
  setCompany(journal, { id: "c", name: "n", slug: "s" })
  assert.equal(existsSync(`${journalPath()}.tmp`), false)
  assert.doesNotThrow(() => JSON.parse(readFileSync(journalPath(), "utf8")))
})

test("no journal means nothing is recorded as owned", () => {
  discardJournal()
  assert.equal(readJournal(), null)
})
