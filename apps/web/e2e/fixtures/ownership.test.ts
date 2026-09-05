/**
 * Ownership across TWO tenants.
 *
 * E2E-0 owned one company, so `destroyRunFixtures` deleted one company. E2E-1
 * creates a second through the onboarding UI, and the old single-company path
 * would have left it behind while still reporting a clean teardown — a silent
 * leak on Review. These tests pin the corrected behaviour and, just as
 * importantly, pin the three ways reconciliation must refuse to act.
 */

import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

/**
 * Redirect run state to a throwaway directory BEFORE importing anything that
 * resolves it. A previous revision of the suite deleted a live recovery journal
 * because it ran against the real `.run` directory; nothing here may ever touch
 * operational state.
 */
const TEST_RUN_DIR = mkdtempSync(resolve(tmpdir(), "evol-e2e-ownership-"))
process.env.E2E_RUN_DIR = TEST_RUN_DIR

// Static imports, deliberately: no `"type": "module"` here, so tsx emits
// CommonJS and a top-level `await import()` fails to transform. The assignment
// above still wins because CJS `require` calls preserve statement order, and
// `runDir()` reads the variable lazily regardless.
import { validateJournal } from "../cleanup"
import {
  journalPath,
  openJournal,
  ownedCompanyIds,
  recordCompany,
  recordUser,
  setCompany,
  setOnboardingCompany,
} from "../helpers/journal"
import { runDir } from "../helpers/run-paths"
import { journalledUserIds } from "./tenant-fixture"

const COMPANY_A = "11111111-1111-4111-8111-111111111111"
const COMPANY_B = "22222222-2222-4222-8222-222222222222"
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const OUTSIDER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

const SEED = {
  runId: "ownership-test",
  createdAt: "2026-09-05T00:00:00.000Z",
  baseUrl: "https://evol-os-review.vercel.app",
  supabaseRef: "rwfvxvbzaosgcyfxdjpt",
  companyId: null,
  companySlug: null,
  companyName: null,
}

function syntheticUser(userId: string) {
  return {
    role: "onboarding" as const,
    membershipRole: "owner" as const,
    email: `e2e+${userId}@evol-e2e.invalid`,
    userId,
    personId: null,
    fullName: "E2E Onboarding test",
    password: "never-used-in-this-suite",
  }
}

test("test run state is provably outside the operational run directory", () => {
  const operational = resolve(process.cwd(), "apps", "web", "e2e", ".run")
  const active = runDir()

  assert.equal(active, TEST_RUN_DIR)
  assert.ok(
    !active.startsWith(operational),
    `focused tests must never resolve into ${operational}; got ${active}`,
  )
  assert.ok(journalPath().startsWith(TEST_RUN_DIR))
})

test("a journal can own more than one company", () => {
  const journal = openJournal(SEED)
  setCompany(journal, { id: COMPANY_A, name: "Tenant A", slug: "tenant-a" })
  recordCompany(journal, COMPANY_B)

  assert.deepEqual(ownedCompanyIds(journal), [COMPANY_A, COMPANY_B])
})

test("recording the same company twice does not duplicate deletion targets", () => {
  const journal = openJournal(SEED)
  setCompany(journal, { id: COMPANY_A, name: "Tenant A", slug: "tenant-a" })
  recordCompany(journal, COMPANY_A)
  recordCompany(journal, COMPANY_A)

  assert.deepEqual(ownedCompanyIds(journal), [COMPANY_A])
})

test("tenant B is journalled without displacing tenant A's scalars", () => {
  const journal = openJournal(SEED)
  setCompany(journal, { id: COMPANY_A, name: "Tenant A", slug: "tenant-a" })

  setOnboardingCompany(journal, {
    companyId: COMPANY_B,
    companyName: "Tenant B",
    companySlug: null,
    ownerUserId: USER_B,
  })

  // Tenant A stays the run's primary tenant for every existing reader...
  assert.equal(journal.companyId, COMPANY_A)
  assert.equal(journal.companyName, "Tenant A")
  // ...and tenant B is still a deletion target.
  assert.ok(ownedCompanyIds(journal).includes(COMPANY_B))
})

test("journalled user ids come from both the users list and the owned ledger", () => {
  const journal = openJournal(SEED)
  recordUser(journal, syntheticUser(USER_A))
  journal.owned.push({ kind: "auth.user", id: USER_B })

  const ids = journalledUserIds(journal).sort()
  assert.deepEqual(ids, [USER_A, USER_B].sort())
  assert.ok(!ids.includes(OUTSIDER), "a non-journalled user is never a reconciliation key")
})

test("a journal carrying a partial tenant B id is refused as deletion authority", () => {
  const journal = openJournal(SEED)
  recordUser(journal, syntheticUser(USER_B))
  journal.onboardingCompany = {
    companyId: "22222222-2222", // truncated on purpose
    companyName: "Tenant B",
    companySlug: null,
    ownerUserId: USER_B,
  }

  const verdict = validateJournal(journal)
  assert.equal(verdict.ok, false)
  assert.match(
    (verdict as { reason: string }).reason,
    /onboardingCompany\.companyId is not a complete UUID/,
  )
})

test("a journal whose tenant B owner id is partial is refused too", () => {
  const journal = openJournal(SEED)
  journal.onboardingCompany = {
    companyId: COMPANY_B,
    companyName: "Tenant B",
    companySlug: null,
    ownerUserId: "bbbb",
  }

  const verdict = validateJournal(journal)
  assert.equal(verdict.ok, false)
  assert.match((verdict as { reason: string }).reason, /ownerUserId is not a complete UUID/)
})

test("a well-formed two-tenant journal is accepted", () => {
  const journal = openJournal(SEED)
  recordUser(journal, syntheticUser(USER_B))
  setCompany(journal, { id: COMPANY_A, name: "Tenant A", slug: "tenant-a" })
  journal.onboardingCompany = {
    companyId: COMPANY_B,
    companyName: "Tenant B",
    companySlug: null,
    ownerUserId: USER_B,
  }
  recordCompany(journal, COMPANY_B)

  assert.deepEqual(validateJournal(journal), { ok: true })
})

test.after(() => {
  rmSync(TEST_RUN_DIR, { recursive: true, force: true })
})
