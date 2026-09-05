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

import { existsSync, rmSync } from "node:fs"

import { destroyRunFixtures, reconcileOwnedCompanies } from "./fixtures/tenant-fixture"
import { e2eEnv } from "./helpers/env"
import { discardJournal, journalPath, readJournal } from "./helpers/journal"
import { storageStatePath, type SyntheticRole } from "./helpers/run-context"

const ROLES: SyntheticRole[] = ["admin", "manager", "employee", "onboarding"]

export type CleanupOutcome = Readonly<{
  ok: boolean
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
      message:
        `ownership journal at ${journalPath()} is malformed (${shape.reason}). ` +
        `Refusing to delete anything: a journal that cannot be trusted is not ` +
        `deletion authority.`,
      orphaned: [],
    }
  }

  if (journal.owned.length === 0 && journal.users.length === 0 && !journal.companyId) {
    discardJournal()
    return { ok: true, message: `run ${journal.runId} recorded no resources.`, orphaned: [] }
  }

  // The env guard refuses Production and Legacy outright; deleting is exactly when
  // that matters most.
  const env = e2eEnv()
  if (journal.supabaseRef && journal.supabaseRef !== env.supabaseRef) {
    return {
      ok: false,
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
      message:
        `reconciliation returned an id that is not a complete UUID (${reconciliation.reason}). ` +
        `Refusing to delete: a partial id is a different predicate, not a narrower one.`,
      orphaned: [],
    }
  }

  if (reconciliation.status === "ambiguous") {
    return {
      ok: false,
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

  const report = await destroyRunFixtures(journal)

  for (const role of ROLES) {
    const file = storageStatePath(role)
    if (existsSync(file)) rmSync(file, { force: true })
  }

  if (report.orphaned.length === 0) {
    discardJournal()
    return {
      ok: true,
      message:
        `run ${journal.runId} cleaned: ${report.companiesDeleted.length} company/companies ` +
        `removed, ${report.usersDeleted.length} auth user(s) removed.`,
      orphaned: [],
    }
  }

  // Journal deliberately kept, so the next run of this command can retry.
  return {
    ok: false,
    message: `run ${journal.runId}: ${report.orphaned.length} resource(s) could not be removed.`,
    orphaned: [...report.orphaned],
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
