/**
 * Global teardown — RUNNER ONLY.
 *
 * Delegates to the same recovery routine `e2e:cleanup` uses, so there is exactly
 * one cleanup implementation. Deletes only what the ownership journal records,
 * and never widens a predicate on failure — an orphan is reported by exact id so
 * a human can decide.
 */

import { cleanupRecordedRun } from "./cleanup"

export default async function globalTeardown(): Promise<void> {
  const outcome = await cleanupRecordedRun()

  console.log("[e2e] teardown: " + outcome.message)
  for (const orphan of outcome.orphaned) {
    console.error("[e2e] ORPHANED " + orphan.kind + " " + orphan.id + ": " + orphan.reason)
  }

  if (!outcome.ok) {
    throw new Error(
      "E2E_CLEANUP_INCOMPLETE: " + outcome.message +
        " The journal was kept; run `npm --workspace apps/web run e2e:cleanup` to retry.",
    )
  }
}
