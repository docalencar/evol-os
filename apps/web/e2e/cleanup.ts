/**
 * Recover a run whose setup crashed — RUNNER ONLY.
 *
 *   npm --workspace apps/web run e2e:cleanup
 *
 * Reads the ownership journal and destroys exactly what it records, reusing the
 * same `destroyRunFixtures` that global teardown uses — there is one cleanup
 * implementation, not two.
 *
 * Refuses to do anything without ownership evidence. A run id, a company slug or
 * a name pattern is **not** deletion authority: only the journal is. That is the
 * difference between recovering your own resources and deleting someone else's.
 */

import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { destroyRunFixtures, reconcileOwnedCompanies } from "./fixtures/tenant-fixture"
import { e2eEnv } from "./helpers/env"
import {
  discardJournal,
  journalPath,
  ownedCompanyIds,
  readJournal,
} from "./helpers/journal"
import { journalledUserIds } from "./fixtures/tenant-fixture"
import { runDir } from "./helpers/run-paths"
import { storageStatePath, type SyntheticRole } from "./helpers/run-context"
import {
  baselineFingerprint,
  classifyRun,
  executeRetirement,
  observeRunState,
  retentionSnapshot,
} from "./lifecycle/retire"
import {
  planRetirement,
  redactJournalForArchive,
  shouldFinalizeJournal,
  type OwnershipFacts,
  type RunTerminalState,
} from "./lifecycle/terminal-state"

const ROLES: SyntheticRole[] = ["admin", "manager", "employee", "onboarding"]

export type CleanupOutcome = Readonly<{
  ok: boolean
  /**
   * The terminal state actually reached. `null` when nothing was decided —
   * a refusal before classification, or a run that owned nothing.
   */
  terminalState: RunTerminalState | null
  message: string
  orphaned: Array<{ kind: string; id: string; reason: string }>
}>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * A journal is deletion authority, so it has to be structurally sound before it
 * is acted on. A truncated id is the dangerous case: `2cbf2b89…` is not a
 * narrower predicate than the full UUID, it is a *different* one, and guessing
 * the rest is exactly the kind of improvisation that deletes someone else's row.
 */
export function validateJournal(journal: unknown): { ok: true } | { ok: false; reason: string } {
  if (typeof journal !== "object" || journal === null) return { ok: false, reason: "not an object" }
  const candidate = journal as Record<string, unknown>

  if (typeof candidate.runId !== "string" || candidate.runId.trim() === "") {
    return { ok: false, reason: "missing runId" }
  }
  if (typeof candidate.supabaseRef !== "string" || candidate.supabaseRef.trim() === "") {
    return { ok: false, reason: "missing supabaseRef — ownership cannot be proven" }
  }
  if (!Array.isArray(candidate.owned)) return { ok: false, reason: "missing owned[]" }
  if (!Array.isArray(candidate.users)) return { ok: false, reason: "missing users[]" }

  if (candidate.companyId !== null && candidate.companyId !== undefined) {
    if (typeof candidate.companyId !== "string" || !UUID.test(candidate.companyId)) {
      return { ok: false, reason: "companyId is not a complete UUID" }
    }
  }

  // Tenant B, when the onboarding journey has run. Same standard as tenant A:
  // a partial id here would be a different predicate, not a narrower one.
  if (candidate.onboardingCompany !== null && candidate.onboardingCompany !== undefined) {
    const tenant = candidate.onboardingCompany as Record<string, unknown>
    if (typeof tenant?.companyId !== "string" || !UUID.test(tenant.companyId)) {
      return { ok: false, reason: "onboardingCompany.companyId is not a complete UUID" }
    }
    if (typeof tenant.ownerUserId !== "string" || !UUID.test(tenant.ownerUserId)) {
      return { ok: false, reason: "onboardingCompany.ownerUserId is not a complete UUID" }
    }
  }

  for (const entry of candidate.owned as Array<Record<string, unknown>>) {
    if (typeof entry?.kind !== "string") return { ok: false, reason: "owned entry without a kind" }
    if (entry.kind === "membership") continue
    if (typeof entry.id !== "string" || !UUID.test(entry.id)) {
      return { ok: false, reason: `owned ${String(entry.kind)} id is not a complete UUID` }
    }
  }

  for (const user of candidate.users as Array<Record<string, unknown>>) {
    if (typeof user?.userId !== "string" || !UUID.test(user.userId)) {
      return { ok: false, reason: "a recorded user id is not a complete UUID" }
    }
  }

  return { ok: true }
}

export async function cleanupRecordedRun(): Promise<CleanupOutcome> {
  const journal = readJournal()

  if (!journal) {
    return {
      ok: true,
      terminalState: null,
      message:
        `no ownership journal at ${journalPath()} — nothing is recorded as owned ` +
        `by a run, so nothing will be deleted. This is not an error.`,
      orphaned: [],
    }
  }

  const shape = validateJournal(journal)
  if (!shape.ok) {
    return {
      ok: false,
      terminalState: null,
      message:
        `ownership journal at ${journalPath()} is malformed (${shape.reason}). ` +
        `Refusing to delete anything: a journal that cannot be trusted is not ` +
        `deletion authority.`,
      orphaned: [],
    }
  }

  if (journal.owned.length === 0 && journal.users.length === 0 && !journal.companyId) {
    discardJournal()
    return {
      ok: true,
      terminalState: "CLEANED",
      message: `run ${journal.runId} recorded no resources.`,
      orphaned: [],
    }
  }

  // The env guard refuses Production and Legacy outright; deleting is exactly when
  // that matters most.
  const env = e2eEnv()
  if (journal.supabaseRef && journal.supabaseRef !== env.supabaseRef) {
    return {
      ok: false,
      terminalState: null,
      message:
        `journal was written against Supabase ref ${journal.supabaseRef} but the ` +
        `current environment points at ${env.supabaseRef}. Refusing to delete.`,
      orphaned: [],
    }
  }

  // Complete the journal from an authoritative source BEFORE anything is deleted.
  // The onboarding journey creates a company through the browser, so there is a
  // window in which a company exists that the journal has not yet heard about.
  // Only full UUIDs, only companies this run's own users OWN, and each one is
  // written to the journal before it becomes a deletion candidate.
  //
  // Every uncertain outcome stops cleanup. Proceeding on a failed or ambiguous
  // reconciliation would delete a partially-known set of resources and then
  // report success, which is worse than stopping: it destroys the evidence
  // needed to finish the job by hand.
  const reconciliation = await reconcileOwnedCompanies(journal)

  if (reconciliation.status === "unavailable") {
    return {
      ok: false,
      terminalState: null,
      message:
        `could not reconcile run-owned companies (${reconciliation.reason}). Refusing to ` +
        `delete: an unreadable control plane is not evidence that nothing was created. ` +
        `The journal was kept.`,
      orphaned: [],
    }
  }

  if (reconciliation.status === "unusable") {
    return {
      ok: false,
      terminalState: null,
      message:
        `reconciliation returned an id that is not a complete UUID (${reconciliation.reason}). ` +
        `Refusing to delete: a partial id is a different predicate, not a narrower one.`,
      orphaned: [],
    }
  }

  if (reconciliation.status === "ambiguous") {
    return {
      ok: false,
      terminalState: null,
      message:
        `ambiguous ownership: synthetic user ${reconciliation.userId} owns more than one ` +
        `unjournalled company (${reconciliation.candidates.join(", ")}). One identity can own ` +
        `at most one company, so this run's model does not match reality. Refusing to guess ` +
        `which to delete — resolve these by hand, then re-run cleanup.`,
      orphaned: reconciliation.candidates.map((id) => ({
        kind: "company",
        id,
        reason: "ambiguous ownership — not deleted",
      })),
    }
  }

  if (reconciliation.adopted.length > 0) {
    console.warn(
      `[e2e] reconciled ${reconciliation.adopted.length} unjournalled company/companies ` +
        `owned by this run's synthetic users: ${reconciliation.adopted.join(", ")}`,
    )
  }

  // -------------------------------------------------------------------------
  // CLASSIFY BEFORE MUTATING.
  //
  // The previous design attempted a delete, caught the immutability error and
  // read its message. That performed a destructive action in order to answer a
  // read-only question, and could only ever recognise the first blocker Postgres
  // happened to name. Now the graph is inspected first and the strategy chosen
  // from evidence.
  // -------------------------------------------------------------------------
  const ownership: OwnershipFacts = {
    runId: journal.runId,
    supabaseRef: journal.supabaseRef,
    companyIds: ownedCompanyIds(journal),
    authUserIds: journalledUserIds(journal),
  }

  const before = await observeRunState(ownership)
  const classification = classifyRun(before, ownership)

  if ("status" in classification) {
    return {
      ok: false,
      terminalState: null,
      message:
        `run ${journal.runId}: cannot classify a terminal state (${classification.status} — ` +
        `${classification.reason}). Refusing to mutate: an unclassifiable graph is not a ` +
        `safe one. The journal was kept.`,
      orphaned: [],
    }
  }

  if (classification.strategy === "RETIRED") {
    return retireRun(journal, ownership, before, classification.blockedBy)
  }

  // ---------------------------------------------------------------------------
  // CLEANED — no retention evidence, so physical deletion remains valid and
  // remains the default. We do not want to accumulate tenants.
  // ---------------------------------------------------------------------------
  const report = await destroyRunFixtures(journal)
  clearStorageState()

  if (report.orphaned.length === 0) {
    discardJournal()
    return {
      ok: true,
      terminalState: "CLEANED",
      message:
        `run ${journal.runId} CLEANED: ${report.companiesDeleted.length} company/companies ` +
        `removed, ${report.usersDeleted.length} auth user(s) removed.`,
      orphaned: [],
    }
  }

  // Classification said deletion was safe and it was not. That is a genuine
  // inconsistency — the graph moved, or the registry is incomplete — and it is
  // exceptional, not a healthy terminal state.
  return {
    ok: false,
    terminalState: "QUARANTINED",
    message:
      `run ${journal.runId}: classified CLEANED but ${report.orphaned.length} resource(s) ` +
      `could not be removed. The graph changed under us, or a retention table is missing ` +
      `from the registry. Journal kept; run \`npm --workspace apps/web run e2e:inspect-run\`.`,
    orphaned: [...report.orphaned],
  }
}

function clearStorageState(): void {
  for (const role of ROLES) {
    const file = storageStatePath(role)
    if (existsSync(file)) rmSync(file, { force: true })
  }
}

/** Archive the journal, redacted, then retire the operational path. */
function finalizeJournal(journal: unknown, runId: string, state: RunTerminalState): string {
  const archiveDir = resolve(runDir(), "archive")
  if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true, mode: 0o700 })

  const archivePath = resolve(archiveDir, `${runId}.${state.toLowerCase()}.json`)
  writeFileSync(archivePath, JSON.stringify(redactJournalForArchive(journal), null, 2), {
    mode: 0o600,
  })

  // Renamed rather than deleted: the operational path is freed for the next run
  // and nothing is destroyed.
  if (existsSync(journalPath())) {
    renameSync(journalPath(), resolve(archiveDir, `${runId}.run.json.retired`))
  }
  return archivePath
}

async function retireRun(
  journal: NonNullable<ReturnType<typeof readJournal>>,
  ownership: OwnershipFacts,
  before: Awaited<ReturnType<typeof observeRunState>>,
  blockedBy: readonly { table: string; rows: number | null }[],
): Promise<CleanupOutcome> {
  const retained = blockedBy.map((probe) => `${probe.table}=${probe.rows}`).join(", ")
  console.log(
    `[e2e] run ${journal.runId}: immutable retention detected (${retained}). ` +
      `Physical deletion is incompatible with the domain; retiring instead.`,
  )

  const plan = planRetirement(ownership)
  const snapshot = retentionSnapshot(before)

  // TOCTOU: the plan was built for an observed world. Refuse if it moved.
  const recheck = await observeRunState(ownership)
  if (baselineFingerprint(recheck) !== baselineFingerprint(before)) {
    return {
      ok: false,
      terminalState: null,
      message:
        `run ${journal.runId}: the run-owned graph changed between classification and ` +
        `retirement. Refusing to apply a plan built for a different state.`,
      orphaned: [],
    }
  }

  const outcome = await executeRetirement(plan, snapshot, ownership)
  for (const step of outcome.applied) console.log(`[e2e]   applied: ${step}`)

  if (!shouldFinalizeJournal(outcome.postconditions ?? { ok: false, mismatches: ["no verdict"] })) {
    const mismatches =
      outcome.postconditions && !outcome.postconditions.ok
        ? outcome.postconditions.mismatches
        : [outcome.failure ?? "unknown failure"]

    // Deliberately NOT reported as RETIRED. A partial mutation is inconsistent,
    // and calling it a healthy terminal state would be the most damaging lie
    // this module could tell.
    return {
      ok: false,
      terminalState: "QUARANTINED",
      message:
        `run ${journal.runId}: retirement did not complete. This is NOT a healthy terminal ` +
        `state. The journal was KEPT so recovery authority survives. Reasons: ` +
        mismatches.join(" | "),
      orphaned: [],
    }
  }

  clearStorageState()
  const archivePath = finalizeJournal(journal, journal.runId, "RETIRED")

  return {
    ok: true,
    terminalState: "RETIRED",
    message:
      `run ${journal.runId} RETIRED: ${ownership.companyIds.length} company/companies made ` +
      `inactive with their people terminated, ${ownership.authUserIds.length} run-owned auth ` +
      `identity/identities banned, immutable audit rows unchanged (${retained}). ` +
      `Evidence: ${archivePath}`,
    orphaned: [],
  }
}

async function main(): Promise<void> {
  const outcome = await cleanupRecordedRun()
  console.log(`[e2e] ${outcome.message}`)
  for (const orphan of outcome.orphaned) {
    console.error(`[e2e] ORPHANED ${orphan.kind} ${orphan.id}: ${orphan.reason}`)
  }
  if (!outcome.ok) {
    console.error(
      "[e2e] The journal was kept so this command can be re-run. Deletion predicates " +
        "are never widened to force progress.",
    )
    process.exitCode = 1
  }
}

if (process.argv[1] && /cleanup\.(ts|js|mjs|cjs)$/.test(process.argv[1])) {
  void main()
}
