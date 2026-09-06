/**
 * Global teardown — RUNNER ONLY.
 *
 * Delegates to the same routine `e2e:cleanup` uses, so there is exactly one
 * implementation. It classifies the run-owned graph before mutating anything and
 * reaches one of two healthy terminal states:
 *
 *   CLEANED  nothing immutable was retained, so the graph was physically removed;
 *   RETIRED  immutable audit retention makes deletion incompatible with the
 *            domain, so operational capability was neutralised and the audit
 *            trail left exactly as it was.
 *
 * Both are success. A run that could not reach either is reported as
 * QUARANTINED, which is an exceptional recovery state and never a healthy
 * outcome — the journal is kept so recovery authority survives.
 */

import { cleanupRecordedRun } from "./cleanup"

export default async function globalTeardown(): Promise<void> {
  const outcome = await cleanupRecordedRun()

  console.log(
    "[e2e] teardown" +
      (outcome.terminalState ? ` [${outcome.terminalState}]` : "") +
      ": " +
      outcome.message,
  )
  for (const orphan of outcome.orphaned) {
    console.error("[e2e] ORPHANED " + orphan.kind + " " + orphan.id + ": " + orphan.reason)
  }

  if (!outcome.ok) {
    throw new Error(
      "E2E_TERMINAL_STATE_NOT_REACHED" +
        (outcome.terminalState ? ` [${outcome.terminalState}]` : "") +
        ": " + outcome.message +
        " The journal was kept; run `npm --workspace apps/web run e2e:cleanup` to retry, or " +
        "`npm --workspace apps/web run e2e:inspect-run` to see the residual graph.",
    )
  }
}
