import assert from "node:assert/strict"
import test from "node:test"

import {
  REVIEW_REF,
  TURNOVER_FIXTURE_STATES,
  assertCanonicalMutation,
  assertHostedProofReady,
  assertOwnedJournal,
  assertRetirementReady,
  assertReviewTarget,
  isClosedPeriodEligible,
  isMtdEligible,
  nextState,
  plannedJournal,
  utcMonthStart,
  type DurableTurnoverJournal,
} from "./lifecycle"

const COMPANY = "11111111-1111-4111-8111-111111111111"
const PERSON = "22222222-2222-4222-8222-222222222222"

function bootstrapped(state: DurableTurnoverJournal["state"] = "BOOTSTRAPPED") {
  return {
    ...plannedJournal(), state, revision: 1,
    company: { id: COMPANY, syntheticName: "E2E Turnover Durable alpha", syntheticSlug: "e2e-turnover-durable-alpha" },
    identities: [{ id: PERSON, kind: "employee" as const, role: "employee" as const }],
  } satisfies DurableTurnoverJournal
}

test("target is exactly Review and Production/Legacy are explicit refusals", () => {
  assert.doesNotThrow(() => assertReviewTarget(REVIEW_REF))
  for (const ref of ["gzrrwyiqfbnyprkdeqvm", "oudngmrdtgengilpqqnz"])
    assert.throws(() => assertReviewTarget(ref), /TARGET_FORBIDDEN/)
  assert.throws(() => assertReviewTarget("aaaaaaaaaaaaaaaaaaaa"), /TARGET_NOT_REVIEW/)
})
test("lifecycle is monotonic, adjacent and terminal", () => {
  let journal = plannedJournal()
  journal = { ...journal, company: bootstrapped().company }
  for (const state of TURNOVER_FIXTURE_STATES.slice(1, 6)) journal = nextState(journal, state)
  journal = { ...journal, hostedEvidenceId: "evidence-1" }
  journal = nextState(journal, "HOSTED_PROVEN")
  journal = nextState(journal, "RETIRED")
  assert.equal(journal.state, "RETIRED")
  assert.throws(() => nextState(journal, "RETIRED"), /TRANSITION_REFUSED/)
  assert.throws(() => nextState(bootstrapped(), "MTD_ELIGIBLE"), /TRANSITION_REFUSED/)
})

test("ownership rejects takeover, malformed ids, duplicate identities and non-synthetic companies", () => {
  assert.doesNotThrow(() => assertOwnedJournal(bootstrapped()))
  assert.throws(() => assertOwnedJournal({ ...bootstrapped(), ownerSlice: "OTHER" } as never), /OWNERSHIP/)
  assert.throws(() => assertOwnedJournal({ ...bootstrapped(), company: { ...bootstrapped().company!, syntheticName: "Acme" } }), /NOT_SYNTHETIC/)
  const identity = bootstrapped().identities[0]
  assert.throws(() => assertOwnedJournal({ ...bootstrapped(), identities: [identity, identity] }), /IDENTITY_INVALID/)
})

test("UTC periods are derived from factual instants, never fixed dates", () => {
  assert.equal(utcMonthStart("2026-10-31T23:59:59.999Z"), "2026-10-01")
  assert.equal(utcMonthStart("2026-11-01T00:00:00.000Z"), "2026-11-01")
  assert.throws(() => utcMonthStart("not-time"), /TIME_INVALID/)
})

test("late bootstrap is unavailable and natural next-period facts can become MTD eligible", () => {
  const base = { kind: "mtd" as const, periodStart: "2026-10-01", coverageStartedAt: "2026-10-07T12:00:00.000Z", headcountAtStart: null, headcountAtEnd: null, closedAt: null, observedAt: "2026-10-07T12:00:00.000Z" }
  assert.equal(isMtdEligible(base), false)
  assert.equal(isMtdEligible({ ...base, periodStart: "2026-11-01", headcountAtStart: 4, observedAt: "2026-11-02T00:00:00.000Z" }), true)
})

test("closed eligibility requires natural closure and both boundary headcounts", () => {
  const closed = { kind: "closed" as const, periodStart: "2026-11-01", coverageStartedAt: "2026-10-07T12:00:00.000Z", headcountAtStart: 4, headcountAtEnd: 3, closedAt: "2026-12-01T00:00:00.000Z", observedAt: "2026-12-01T00:01:00.000Z" }
  assert.equal(isClosedPeriodEligible(closed), true)
  assert.equal(isClosedPeriodEligible({ ...closed, headcountAtEnd: null }), false)
  assert.equal(isClosedPeriodEligible({ ...closed, closedAt: null }), false)
})

test("mutation receipts target only journal-owned company or identities", () => {
  const journal = bootstrapped()
  assert.doesNotThrow(() => assertCanonicalMutation({ kind: "people-created", targetId: PERSON, occurredAt: "2026-10-07T12:00:00Z" }, journal))
  assert.doesNotThrow(() => assertCanonicalMutation({ kind: "turnover-boundary-observed", targetId: COMPANY, occurredAt: "2026-11-01T12:00:00Z" }, journal))
  assert.throws(() => assertCanonicalMutation({ kind: "person-archived", targetId: "33333333-3333-4333-8333-333333333333", occurredAt: "2026-11-01T12:00:00Z" }, journal), /NOT_OWNED/)
})

test("hosted proof and retirement are gated by exact lifecycle state", () => {
  assert.throws(() => assertHostedProofReady(bootstrapped("MTD_ELIGIBLE")), /PREMATURE/)
  assert.doesNotThrow(() => assertHostedProofReady(bootstrapped("POSITIVE_FACT_READY")))
  assert.throws(() => assertRetirementReady(bootstrapped("POSITIVE_FACT_READY")), /PREMATURE/)
  assert.doesNotThrow(() => assertRetirementReady({ ...bootstrapped("HOSTED_PROVEN"), hostedEvidenceId: "evidence-1" }))
})
