import assert from "node:assert/strict"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { fileBootstrapEvidenceStore } from "./bootstrap-evidence"
import {
  assertPre,
  assertToctou,
  EXPECTED_LEDGER,
  EXPECTED_MAIN,
  EXPECTED_MIGRATION_SHA,
  runTurnoverFixtureBootstrap,
  type RemoteSnapshot,
  type TurnoverBootstrapAdapter,
} from "./bootstrap-runner"
import { createDurableTurnoverJournal, readDurableTurnoverJournal } from "./journal-store"
import { plannedJournal, REVIEW_REF } from "./lifecycle"

const ACTOR = "11111111-1111-4111-8111-111111111111"
const COMPANY = "22222222-2222-4222-8222-222222222222"
const OWNER_PERSON = "33333333-3333-4333-8333-333333333333"
const EMPLOYEE = "44444444-4444-4444-8444-444444444444"
const NOW = "2026-10-07T18:00:00.000Z"

function snapshot(changes: Partial<RemoteSnapshot> = {}): RemoteSnapshot {
  return Object.freeze({ reviewRef: REVIEW_REF, canonicalMain: EXPECTED_MAIN, ledger: EXPECTED_LEDGER, migration0142Count: 1, migration0142Sha256: EXPECTED_MIGRATION_SHA, markerCompanyIds: [], journalRevision: 0, ...changes })
}

function paths() {
  const root = mkdtempSync(join(tmpdir(), "turnover-bootstrap-"))
  return { journal: join(root, "ownership.json"), evidence: join(root, "evidence.json") }
}

function adapter(overrides: Partial<TurnoverBootstrapAdapter> = {}): TurnoverBootstrapAdapter {
  return {
    inspect: async () => snapshot(),
    createActor: async () => ({ userId: ACTOR }),
    createCompany: async () => ({ companyId: COMPANY, ownerPersonId: OWNER_PERSON }),
    createEmployee: async () => ({ personId: EMPLOYEE }),
    observeTurnover: async () => ({ companyId: COMPANY, coverageStartedAt: NOW, generatedAt: NOW, currentAvailability: "unavailable", currentUnavailableReason: "incomplete_coverage" }),
    verifyOwnership: async () => true,
    ...overrides,
  }
}

test("PRE accepts only exact Review, main, 0001-0142 and absent marker", () => {
  assert.doesNotThrow(() => assertPre(snapshot(), plannedJournal()))
  for (const bad of [
    snapshot({ reviewRef: "gzrrwyiqfbnyprkdeqvm" }),
    snapshot({ reviewRef: "oudngmrdtgengilpqqnz" }),
    snapshot({ reviewRef: "wrong-ref" }),
    snapshot({ canonicalMain: "0".repeat(40) }),
    snapshot({ ledger: EXPECTED_LEDGER.slice(0, -1) }),
    snapshot({ ledger: [...EXPECTED_LEDGER, "0143"] }),
    snapshot({ migration0142Count: 2 }),
    snapshot({ markerCompanyIds: [COMPANY] }),
  ]) assert.throws(() => assertPre(bad, plannedJournal()))
})

test("PRE rejects existing tenant adoption, wrong lifecycle and journal drift", () => {
  assert.throws(() => assertPre(snapshot(), { ...plannedJournal(), company: { id: COMPANY, syntheticName: "E2E Turnover Durable existing", syntheticSlug: "e2e-turnover-durable-existing" } }))
  assert.throws(() => assertPre(snapshot(), { ...plannedJournal(), state: "BOOTSTRAPPED", company: { id: COMPANY, syntheticName: "E2E Turnover Durable existing", syntheticSlug: "e2e-turnover-durable-existing" } }))
  assert.throws(() => assertPre(snapshot({ journalRevision: 1 }), plannedJournal()))
  assert.throws(() => assertPre(snapshot(), { ...plannedJournal(), identities: [{ id: ACTOR, kind: "actor", role: "owner" }] }))
})

test("TOCTOU rejects target, migration, marker, journal and main drift", () => {
  const pre = snapshot()
  for (const current of [
    snapshot({ reviewRef: "wrong-ref" }),
    snapshot({ migration0142Sha256: "f".repeat(64) }),
    snapshot({ markerCompanyIds: [COMPANY] }),
    snapshot({ journalRevision: 1 }),
    snapshot({ canonicalMain: "f".repeat(40) }),
  ]) assert.throws(() => assertToctou(pre, current, plannedJournal()))
})

test("runner persists ownership and stops exactly at COVERAGE_STARTED", async () => {
  const file = paths()
  createDurableTurnoverJournal(file.journal)
  const result = await runTurnoverFixtureBootstrap({ journalPath: file.journal, evidence: fileBootstrapEvidenceStore(file.evidence), adapter: adapter(), now: () => NOW })
  assert.equal(result.state, "COVERAGE_STARTED")
  assert.equal(result.company?.id, COMPANY)
  assert.deepEqual(result.identities.map(({ id }) => id), [ACTOR, OWNER_PERSON, EMPLOYEE])
  assert.equal(result.coverageStartedAt, NOW)
  const evidence = readFileSync(file.evidence, "utf8")
  assert.doesNotMatch(evidence, /password|service.?role|anon.?key|token/i)
  assert.match(evidence, /"phase": "POST"/)
  assert.match(evidence, new RegExp(`"targetId": "${COMPANY}"`))
  assert.equal(readDurableTurnoverJournal(file.journal).state, "COVERAGE_STARTED")
})

test("mutation is impossible before PRE and TOCTOU both pass", async () => {
  const file = paths()
  createDurableTurnoverJournal(file.journal)
  let mutations = 0
  let inspections = 0
  await assert.rejects(() => runTurnoverFixtureBootstrap({
    journalPath: file.journal,
    evidence: fileBootstrapEvidenceStore(file.evidence),
    adapter: adapter({ inspect: async () => { inspections += 1; return inspections === 1 ? snapshot() : snapshot({ markerCompanyIds: [COMPANY] }) }, createActor: async () => { mutations += 1; return { userId: ACTOR } } }),
    now: () => NOW,
  }))
  assert.equal(mutations, 0)
})

test("ambiguous company creation is terminal and no second company is attempted", async () => {
  const file = paths()
  createDurableTurnoverJournal(file.journal)
  let companies = 0
  await assert.rejects(() => runTurnoverFixtureBootstrap({ journalPath: file.journal, evidence: fileBootstrapEvidenceStore(file.evidence), adapter: adapter({ createCompany: async () => { companies += 1; throw new Error("transport lost") } }), now: () => NOW }), /UNKNOWN_REMOTE_OUTCOME/)
  assert.equal(companies, 1)
  assert.match(readFileSync(file.evidence, "utf8"), /UNKNOWN_REMOTE_OUTCOME/)
  assert.equal(readDurableTurnoverJournal(file.journal).state, "PLANNED")
})

test("POST ownership drift interrupts without advancing beyond COVERAGE_STARTED", async () => {
  const file = paths()
  createDurableTurnoverJournal(file.journal)
  await assert.rejects(() => runTurnoverFixtureBootstrap({ journalPath: file.journal, evidence: fileBootstrapEvidenceStore(file.evidence), adapter: adapter({ verifyOwnership: async () => false }), now: () => NOW }), /POST_FAILED/)
  assert.equal(readDurableTurnoverJournal(file.journal).state, "COVERAGE_STARTED")
})
