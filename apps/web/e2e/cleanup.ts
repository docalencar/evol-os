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

import { destroyRunFixtures } from "./fixtures/tenant-fixture"
import { e2eEnv } from "./helpers/env"
import { discardJournal, readJournal } from "./helpers/journal"
import { storageStatePath, type SyntheticRole } from "./helpers/run-context"

const ROLES: SyntheticRole[] = ["admin", "manager", "employee"]

export type CleanupOutcome = Readonly<{
  ok: boolean
  message: string
  orphaned: Array<{ kind: string; id: string; reason: string }>
}>

export async function cleanupRecordedRun(): Promise<CleanupOutcome> {
  const journal = readJournal()

  if (!journal) {
    return {
      ok: true,
      message:
        "no ownership journal — nothing is recorded as owned by a run, so nothing " +
        "will be deleted. This is not an error.",
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
        `run ${journal.runId} cleaned: company ${report.companyDeleted ? "removed" : "n/a"}, ` +
        `${report.usersDeleted.length} auth user(s) removed.`,
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
