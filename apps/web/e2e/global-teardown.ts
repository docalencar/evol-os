/**
 * Global teardown — RUNNER ONLY.
 *
 * Deletes only what the manifest says this run created. Deletion predicates are
 * never broadened on failure: an orphan is reported by exact id so a human can
 * decide, which is safer than a wider `delete`.
 *
 * Storage state files are removed too — they hold live session tokens.
 */

import { existsSync, rmSync } from "node:fs"

import { destroyRunFixtures } from "./fixtures/tenant-fixture"
import { readManifest, storageStatePath, type SyntheticRole } from "./helpers/run-context"

const ROLES: SyntheticRole[] = ["admin", "manager", "employee"]

export default async function globalTeardown(): Promise<void> {
  let manifest
  try {
    manifest = readManifest()
  } catch {
    console.warn("[e2e] teardown: no run manifest; nothing owned by this run to remove.")
    return
  }

  const report = await destroyRunFixtures(manifest)

  console.log(
    [
      "[e2e] teardown run  : " + manifest.runId,
      "[e2e] company removed: " + report.companyDeleted,
      "[e2e] users removed  : " + report.usersDeleted.length + "/" + manifest.users.length,
    ].join("\n"),
  )

  for (const orphan of report.orphaned) {
    console.error(
      "[e2e] ORPHANED " + orphan.kind + " " + orphan.id + " (run " + manifest.runId + "): " + orphan.reason,
    )
  }

  for (const role of ROLES) {
    const file = storageStatePath(role)
    if (existsSync(file)) rmSync(file, { force: true })
  }

  if (report.orphaned.length > 0) {
    throw new Error(
      "E2E_CLEANUP_INCOMPLETE: run " + manifest.runId + " left " + report.orphaned.length +
        " resource(s) behind. They are listed above by exact id; remove them deliberately.",
    )
  }
}
