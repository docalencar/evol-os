export const TURNOVER_FIXTURE_MARKER = "evol-turnover-durable-fixture-v1" as const
export const TURNOVER_FIXTURE_OWNER = "T-E2E0A" as const
export const REVIEW_REF = "rwfvxvbzaosgcyfxdjpt" as const
export const FORBIDDEN_REFS = Object.freeze([
  "gzrrwyiqfbnyprkdeqvm",
  "oudngmrdtgengilpqqnz",
])

export const TURNOVER_FIXTURE_STATES = Object.freeze([
  "PLANNED",
  "BOOTSTRAPPED",
  "COVERAGE_STARTED",
  "MTD_ELIGIBLE",
  "CLOSED_PERIOD_ELIGIBLE",
  "POSITIVE_FACT_READY",
  "HOSTED_PROVEN",
  "RETIRED",
] as const)

export type TurnoverFixtureState = (typeof TURNOVER_FIXTURE_STATES)[number]
export type OwnedSyntheticIdentity = Readonly<{
  id: string
  kind: "actor" | "employee"
  role: "owner" | "admin" | "hr" | "manager" | "employee" | null
}>
export type CanonicalMutationReceipt = Readonly<{
  kind: "people-created" | "turnover-boundary-observed" | "person-archived"
  targetId: string
  occurredAt: string
}>
export type PeriodObservation = Readonly<{
  kind: "mtd" | "closed"
  periodStart: string
  coverageStartedAt: string
  headcountAtStart: number | null
  headcountAtEnd: number | null
  closedAt: string | null
  observedAt: string
}>
export type DurableTurnoverJournal = Readonly<{
  schemaVersion: 1
  marker: typeof TURNOVER_FIXTURE_MARKER
  ownerSlice: typeof TURNOVER_FIXTURE_OWNER
  supabaseRef: typeof REVIEW_REF
  state: TurnoverFixtureState
  revision: number
  company: null | Readonly<{ id: string; syntheticName: string; syntheticSlug: string }>
  identities: readonly OwnedSyntheticIdentity[]
  coverageStartedAt: string | null
  observedPeriods: readonly PeriodObservation[]
  mutations: readonly CanonicalMutationReceipt[]
  hostedEvidenceId: string | null
  retiredAt: string | null
}>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const SYNTHETIC = /^E2E Turnover Durable [a-z0-9-]+$/
const SYNTHETIC_SLUG = /^e2e-turnover-durable-[a-z0-9-]+$/

export function plannedJournal(): DurableTurnoverJournal {
  return Object.freeze({
    schemaVersion: 1,
    marker: TURNOVER_FIXTURE_MARKER,
    ownerSlice: TURNOVER_FIXTURE_OWNER,
    supabaseRef: REVIEW_REF,
    state: "PLANNED",
    revision: 0,
    company: null,
    identities: Object.freeze([]),
    coverageStartedAt: null,
    observedPeriods: Object.freeze([]),
    mutations: Object.freeze([]),
    hostedEvidenceId: null,
    retiredAt: null,
  })
}
export function assertReviewTarget(ref: string): void {
  if (FORBIDDEN_REFS.includes(ref as never)) throw new Error("TURNOVER_FIXTURE_TARGET_FORBIDDEN")
  if (ref !== REVIEW_REF) throw new Error("TURNOVER_FIXTURE_TARGET_NOT_REVIEW")
}

export function assertOwnedJournal(journal: DurableTurnoverJournal): void {
  assertReviewTarget(journal.supabaseRef)
  if (journal.marker !== TURNOVER_FIXTURE_MARKER || journal.ownerSlice !== TURNOVER_FIXTURE_OWNER) {
    throw new Error("TURNOVER_FIXTURE_OWNERSHIP_MISMATCH")
  }
  if (!Number.isSafeInteger(journal.revision) || journal.revision < 0) {
    throw new Error("TURNOVER_FIXTURE_REVISION_INVALID")
  }
  if (journal.company) {
    if (!UUID.test(journal.company.id) || !SYNTHETIC.test(journal.company.syntheticName) ||
      !SYNTHETIC_SLUG.test(journal.company.syntheticSlug)) {
      throw new Error("TURNOVER_FIXTURE_COMPANY_NOT_SYNTHETIC")
    }
  }
  const ids = journal.identities.map((identity) => identity.id)
  if (ids.some((id) => !UUID.test(id)) || new Set(ids).size !== ids.length) {
    throw new Error("TURNOVER_FIXTURE_IDENTITY_INVALID")
  }
  if (journal.state !== "PLANNED" && !journal.company) {
    throw new Error("TURNOVER_FIXTURE_COMPANY_MISSING")
  }
}

export function nextState(
  journal: DurableTurnoverJournal,
  requested: TurnoverFixtureState,
): DurableTurnoverJournal {
  assertOwnedJournal(journal)
  const current = TURNOVER_FIXTURE_STATES.indexOf(journal.state)
  const next = TURNOVER_FIXTURE_STATES.indexOf(requested)
  if (journal.state === "RETIRED" || next !== current + 1) {
    throw new Error("TURNOVER_FIXTURE_TRANSITION_REFUSED")
  }
  if (requested === "HOSTED_PROVEN" && journal.hostedEvidenceId === null) {
    throw new Error("TURNOVER_FIXTURE_HOSTED_EVIDENCE_REQUIRED")
  }
  return Object.freeze({ ...journal, state: requested, revision: journal.revision + 1 })
}

export function utcMonthStart(instant: string): string {
  const parsed = new Date(instant)
  if (Number.isNaN(parsed.valueOf())) throw new Error("TURNOVER_FIXTURE_TIME_INVALID")
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-01`
}

export function isMtdEligible(observation: PeriodObservation): boolean {
  return observation.kind === "mtd" &&
    observation.coverageStartedAt <= `${observation.periodStart}T00:00:00.000Z` &&
    observation.headcountAtStart !== null &&
    observation.headcountAtEnd === null && observation.closedAt === null
}

export function isClosedPeriodEligible(observation: PeriodObservation): boolean {
  return observation.kind === "closed" &&
    observation.coverageStartedAt <= `${observation.periodStart}T00:00:00.000Z` &&
    observation.headcountAtStart !== null && observation.headcountAtEnd !== null &&
    observation.closedAt !== null
}

export function assertCanonicalMutation(receipt: CanonicalMutationReceipt, journal: DurableTurnoverJournal): void {
  assertOwnedJournal(journal)
  if (!UUID.test(receipt.targetId) || Number.isNaN(new Date(receipt.occurredAt).valueOf())) {
    throw new Error("TURNOVER_FIXTURE_MUTATION_RECEIPT_INVALID")
  }
  const owned = receipt.kind === "turnover-boundary-observed"
    ? journal.company?.id === receipt.targetId
    : journal.identities.some((identity) => identity.id === receipt.targetId)
  if (!owned) throw new Error("TURNOVER_FIXTURE_MUTATION_TARGET_NOT_OWNED")
}

export function assertHostedProofReady(journal: DurableTurnoverJournal): void {
  assertOwnedJournal(journal)
  if (journal.state !== "POSITIVE_FACT_READY") {
    throw new Error("TURNOVER_FIXTURE_HOSTED_PROOF_PREMATURE")
  }
}

export function assertRetirementReady(journal: DurableTurnoverJournal): void {
  assertOwnedJournal(journal)
  if (journal.state !== "HOSTED_PROVEN") {
    throw new Error("TURNOVER_FIXTURE_RETIREMENT_PREMATURE")
  }
}
