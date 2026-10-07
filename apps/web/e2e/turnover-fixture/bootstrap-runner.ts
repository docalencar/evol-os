import { createHash } from "node:crypto"

import {
  assertCanonicalMutation,
  assertOwnedJournal,
  nextState,
  type CanonicalMutationReceipt,
  type DurableTurnoverJournal,
  type OwnedSyntheticIdentity,
} from "./lifecycle"
import {
  readDurableTurnoverJournal,
  replaceDurableTurnoverJournal,
} from "./journal-store"

export const EXPECTED_MAIN = "c30ab3c96fead374c5e334c3e56e345764d5924c" as const
export const EXPECTED_MIGRATION_SHA = "17a8d02f8fdf915122d68666ca8714ba5ba2ea62ebebd759b9a81e32b558a4c9" as const
export const EXPECTED_LEDGER = Object.freeze(Array.from({ length: 142 }, (_, index) => String(index + 1).padStart(4, "0")))

export type AttemptState = "NOT_ATTEMPTED" | "ATTEMPTED" | "APPLIED" | "VERIFIED" | "UNKNOWN_REMOTE_OUTCOME"
export type MutationKind = "actor" | "company" | "employee" | "first-observation"
export type MutationAttempt = Readonly<{
  id: string
  kind: MutationKind
  state: AttemptState
  targetId: string | null
  occurredAt: string
}>
export type RemoteSnapshot = Readonly<{
  reviewRef: string
  canonicalMain: string
  ledger: readonly string[]
  migration0142Count: number
  migration0142Sha256: string
  markerCompanyIds: readonly string[]
  journalRevision: number
}>
export type TurnoverObservation = Readonly<{
  companyId: string
  coverageStartedAt: string
  generatedAt: string
  currentAvailability: "unavailable"
  currentUnavailableReason: "incomplete_coverage"
}>
export type BootstrapEvidence = Readonly<{
  schemaVersion: 1
  targetRef: string
  canonicalMain: string
  phase: "PRE" | "TOCTOU" | "BOOTSTRAP" | "FIRST_OBSERVATION" | "POST" | "FAILED"
  pre: RemoteSnapshot | null
  toctou: RemoteSnapshot | null
  attempts: readonly MutationAttempt[]
  observation: TurnoverObservation | null
  journalRevisions: readonly number[]
  errorCode: string | null
}>

export interface BootstrapEvidenceStore {
  create(evidence: BootstrapEvidence): void
  replace(evidence: BootstrapEvidence): void
}

export interface TurnoverBootstrapAdapter {
  inspect(): Promise<RemoteSnapshot>
  createActor(input: Readonly<{ marker: string; role: "owner" }>): Promise<Readonly<{ userId: string }>>
  createCompany(input: Readonly<{ ownerUserId: string; name: string; slug: string }>): Promise<Readonly<{ companyId: string; ownerPersonId: string }>>
  createEmployee(input: Readonly<{ companyId: string; marker: string }>): Promise<Readonly<{ personId: string }>>
  observeTurnover(companyId: string): Promise<TurnoverObservation>
  verifyOwnership(companyId: string, ownedIds: readonly string[]): Promise<boolean>
}

function sameSnapshot(left: RemoteSnapshot, right: RemoteSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function assertPre(snapshot: RemoteSnapshot, journal: DurableTurnoverJournal): void {
  assertOwnedJournal(journal)
  if (journal.state !== "PLANNED" || journal.company !== null || journal.identities.length !== 0 || journal.mutations.length !== 0 || journal.coverageStartedAt !== null || journal.hostedEvidenceId !== null) throw new Error("TURNOVER_BOOTSTRAP_JOURNAL_NOT_PRISTINE")
  if (snapshot.reviewRef !== journal.supabaseRef) throw new Error("TURNOVER_BOOTSTRAP_WRONG_TARGET")
  if (snapshot.canonicalMain !== EXPECTED_MAIN) throw new Error("TURNOVER_BOOTSTRAP_STALE_MAIN")
  if (snapshot.migration0142Count !== 1 || snapshot.migration0142Sha256 !== EXPECTED_MIGRATION_SHA) throw new Error("TURNOVER_BOOTSTRAP_MIGRATION_MISMATCH")
  if (snapshot.ledger.length !== EXPECTED_LEDGER.length || snapshot.ledger.some((value, index) => value !== EXPECTED_LEDGER[index])) throw new Error("TURNOVER_BOOTSTRAP_LEDGER_MISMATCH")
  if (snapshot.markerCompanyIds.length !== 0) throw new Error("TURNOVER_BOOTSTRAP_DUPLICATE_FIXTURE")
  if (snapshot.journalRevision !== journal.revision) throw new Error("TURNOVER_BOOTSTRAP_JOURNAL_DRIFT")
}

export function assertToctou(pre: RemoteSnapshot, current: RemoteSnapshot, journal: DurableTurnoverJournal): void {
  assertPre(current, journal)
  if (!sameSnapshot(pre, current)) throw new Error("TURNOVER_BOOTSTRAP_TOCTOU_DRIFT")
}

function receipt(kind: CanonicalMutationReceipt["kind"], targetId: string, occurredAt: string): CanonicalMutationReceipt {
  return Object.freeze({ kind, targetId, occurredAt })
}

function withRevision(journal: DurableTurnoverJournal, changes: Partial<DurableTurnoverJournal>): DurableTurnoverJournal {
  return Object.freeze({ ...journal, ...changes, revision: journal.revision + 1 })
}

export async function runTurnoverFixtureBootstrap(input: Readonly<{
  journalPath: string
  adapter: TurnoverBootstrapAdapter
  evidence: BootstrapEvidenceStore
  now: () => string
}>): Promise<DurableTurnoverJournal> {
  let journal = readDurableTurnoverJournal(input.journalPath)
  let record: BootstrapEvidence = Object.freeze({ schemaVersion: 1, targetRef: journal.supabaseRef, canonicalMain: EXPECTED_MAIN, phase: "PRE", pre: null, toctou: null, attempts: [], observation: null, journalRevisions: [journal.revision], errorCode: null })
  input.evidence.create(record)
  const saveEvidence = (changes: Partial<BootstrapEvidence>) => {
    record = Object.freeze({ ...record, ...changes })
    input.evidence.replace(record)
  }
  const saveJournal = (next: DurableTurnoverJournal) => {
    replaceDurableTurnoverJournal(input.journalPath, journal.revision, next)
    journal = readDurableTurnoverJournal(input.journalPath)
    saveEvidence({ journalRevisions: [...record.journalRevisions, journal.revision] })
  }
  const attempt = async <T>(kind: MutationKind, operation: () => Promise<T>, targetOf: (result: T) => string): Promise<T> => {
    const id = createHash("sha256").update(`${kind}:${input.now()}:${record.attempts.length}`).digest("hex")
    const started: MutationAttempt = Object.freeze({ id, kind, state: "ATTEMPTED", targetId: null, occurredAt: input.now() })
    saveEvidence({ attempts: [...record.attempts, started] })
    try {
      const result = await operation()
      saveEvidence({ attempts: record.attempts.map((item) => item.id === id ? { ...item, state: "APPLIED", targetId: targetOf(result) } : item) })
      return result
    } catch {
      saveEvidence({ phase: "FAILED", attempts: record.attempts.map((item) => item.id === id ? { ...item, state: "UNKNOWN_REMOTE_OUTCOME" } : item), errorCode: "UNKNOWN_REMOTE_OUTCOME" })
      throw new Error("UNKNOWN_REMOTE_OUTCOME")
    }
  }

  const pre = await input.adapter.inspect()
  assertPre(pre, journal)
  saveEvidence({ pre })
  const toctou = await input.adapter.inspect()
  assertToctou(pre, toctou, journal)
  saveEvidence({ phase: "TOCTOU", toctou })

  saveEvidence({ phase: "BOOTSTRAP" })
  const actor = await attempt("actor", () => input.adapter.createActor({ marker: journal.marker, role: "owner" }), ({ userId }) => userId)
  const owner: OwnedSyntheticIdentity = Object.freeze({ id: actor.userId, kind: "actor", role: "owner" })
  saveJournal(withRevision(journal, { identities: [...journal.identities, owner] }))

  const identity = { name: `E2E Turnover Durable ${actor.userId}`, slug: `e2e-turnover-durable-${actor.userId}` }
  const company = await attempt("company", () => input.adapter.createCompany({ ownerUserId: actor.userId, name: identity.name, slug: identity.slug }), ({ companyId }) => companyId)
  const ownerPerson: OwnedSyntheticIdentity = Object.freeze({ id: company.ownerPersonId, kind: "employee", role: "owner" })
  saveJournal(nextState(Object.freeze({ ...journal, company: { id: company.companyId, syntheticName: identity.name, syntheticSlug: identity.slug }, identities: [...journal.identities, ownerPerson] }), "BOOTSTRAPPED"))

  const employee = await attempt("employee", () => input.adapter.createEmployee({ companyId: company.companyId, marker: journal.marker }), ({ personId }) => personId)
  const employeeIdentity: OwnedSyntheticIdentity = Object.freeze({ id: employee.personId, kind: "employee", role: "employee" })
  const createdAt = input.now()
  const createdReceipt = receipt("people-created", employee.personId, createdAt)
  assertCanonicalMutation(createdReceipt, { ...journal, identities: [...journal.identities, employeeIdentity] })
  saveJournal(withRevision(journal, { identities: [...journal.identities, employeeIdentity], mutations: [...journal.mutations, createdReceipt] }))

  saveEvidence({ phase: "FIRST_OBSERVATION" })
  const observation = await attempt("first-observation", () => input.adapter.observeTurnover(company.companyId), ({ companyId }) => companyId)
  if (observation.companyId !== company.companyId || observation.currentAvailability !== "unavailable" || observation.currentUnavailableReason !== "incomplete_coverage") throw new Error("TURNOVER_BOOTSTRAP_OBSERVATION_INVALID")
  const observationReceipt = receipt("turnover-boundary-observed", company.companyId, observation.generatedAt)
  assertCanonicalMutation(observationReceipt, journal)
  saveJournal(nextState(Object.freeze({ ...journal, coverageStartedAt: observation.coverageStartedAt, mutations: [...journal.mutations, observationReceipt] }), "COVERAGE_STARTED"))

  saveEvidence({ phase: "POST", observation })
  const ownedIds = journal.identities.map(({ id }) => id)
  if (journal.state !== "COVERAGE_STARTED" || journal.company?.id !== company.companyId || !await input.adapter.verifyOwnership(company.companyId, ownedIds)) throw new Error("TURNOVER_BOOTSTRAP_POST_FAILED")
  saveEvidence({ attempts: record.attempts.map((item) => ({ ...item, state: item.state === "APPLIED" ? "VERIFIED" : item.state })) })
  return journal
}
