/**
 * Recovery must be discoverable, exact and refuse to improvise.
 *
 * The regression this guards: `e2e:cleanup` reported "no ownership journal" for a
 * run whose journal had been written minutes earlier — the test suite had deleted
 * it, because the tests operated on the real run directory instead of a temporary
 * one. Writer and reader must resolve the same path, and tests must not be able to
 * touch it.
 */

import assert from "node:assert/strict"
import { existsSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

process.env.E2E_RUN_DIR = mkdtempSync(resolve(tmpdir(), "evol-e2e-cleanup-"))

import { validateJournal } from "./cleanup"
import { discardJournal, journalPath, openJournal, readJournal, recordUser } from "./helpers/journal"
import { storageStatePath } from "./helpers/run-context"
import { journalFile, runDir } from "./helpers/run-paths"

const REF = "rwfvxvbzaosgcyfxdjpt"
const UUID_A = "32f951bd-3ab8-48f8-8721-d0736704a95c"
const UUID_B = "2cbf2b89-b65f-4b7b-af78-972a6bb70b50"

const SEED = {
  runId: "260905212333-a14562",
  createdAt: "2026-09-05T21:23:33.000Z",
  baseUrl: "https://evol-os-review.vercel.app",
  supabaseRef: REF,
  companyId: null,
  companySlug: null,
  companyName: null,
}

test.afterEach(() => discardJournal())

test("writer and cleanup resolve the same journal path", () => {
  openJournal(SEED)
  assert.equal(journalPath(), journalFile())
  assert.equal(existsSync(journalFile()), true)
})

test("all run-state consumers agree on one root", () => {
  const root = runDir()
  assert.equal(journalFile().startsWith(root), true)
  assert.equal(storageStatePath("admin").startsWith(root), true)
})

test("the journal is discoverable after a process restart", () => {
  const journal = openJournal(SEED)
  recordUser(journal, {
    role: "admin",
    membershipRole: "owner",
    email: "e2e+260905212333-a14562-admin@evol-e2e.invalid",
    userId: UUID_A,
    personId: null,
    fullName: "E2E Admin",
    password: "",
  })

  // A fresh read is what a later `npm run e2e:cleanup` process does.
  const recovered = readJournal()
  assert.equal(recovered?.runId, "260905212333-a14562")
  assert.equal(recovered?.users[0]?.userId, UUID_A)
})

test("a complete journal validates", () => {
  const result = validateJournal({
    runId: "r", supabaseRef: REF, companyId: UUID_B, users: [{ userId: UUID_A }],
    owned: [{ kind: "auth.user", id: UUID_A }, { kind: "company", id: UUID_B }],
  })
  assert.equal(result.ok, true)
})

test("a truncated id is refused — it is a different predicate, not a narrower one", () => {
  const truncated = validateJournal({
    runId: "r", supabaseRef: REF, companyId: "2cbf2b89", users: [],
    owned: [{ kind: "company", id: "2cbf2b89" }],
  })
  assert.equal(truncated.ok, false)
  assert.match(truncated.ok ? "" : truncated.reason, /complete UUID/)

  const truncatedOwned = validateJournal({
    runId: "r", supabaseRef: REF, companyId: null, users: [],
    owned: [{ kind: "auth.user", id: "32f951bd-3ab8" }],
  })
  assert.equal(truncatedOwned.ok, false)
})

test("a journal without ownership evidence is refused", () => {
  for (const bad of [
    null,
    "a string",
    { supabaseRef: REF, users: [], owned: [] },              // no runId
    { runId: "r", users: [], owned: [] },                     // no supabaseRef
    { runId: "r", supabaseRef: REF, users: [] },              // no owned[]
    { runId: "r", supabaseRef: REF, owned: [] },              // no users[]
    { runId: "r", supabaseRef: REF, users: [{ userId: "nope" }], owned: [] },
  ]) {
    assert.equal(validateJournal(bad).ok, false, `expected ${JSON.stringify(bad)} to be refused`)
  }
})

test("membership entries carry a composite key, not an id, and are accepted", () => {
  const result = validateJournal({
    runId: "r", supabaseRef: REF, companyId: UUID_B, users: [],
    owned: [{ kind: "membership", companyId: UUID_B, userId: UUID_A }],
  })
  assert.equal(result.ok, true)
})

test("a malformed journal file reads as absent rather than as authority", () => {
  writeFileSync(journalFile(), "{ this is not json", { mode: 0o600 })
  assert.equal(readJournal(), null)
})

test("no journal means no destructive action is even possible", async () => {
  discardJournal()
  const { cleanupRecordedRun } = await import("./cleanup")
  const outcome = await cleanupRecordedRun()
  assert.equal(outcome.ok, true)
  assert.match(outcome.message, /no ownership journal/)
  assert.match(outcome.message, /nothing will be deleted/)
  // The message names the path it looked at, so a mismatch is self-diagnosing.
  assert.match(outcome.message, new RegExp(journalFile().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
})
