/**
 * The one canonical run-state root — RUNNER ONLY.
 *
 * Every producer and consumer of run state resolves its paths here: global setup,
 * the journal writer, teardown, `e2e:cleanup`, and the specs that read storage
 * state. Duplicated path arithmetic is what let a writer and a reader disagree.
 *
 * `E2E_RUN_DIR` overrides the location. That exists so the test suite can operate
 * on a temporary directory: an earlier revision's tests called `discardJournal()`
 * in `afterEach` against the *real* directory, so running `npm test` silently
 * deleted a live recovery journal. Tests must never be able to destroy operational
 * state.
 *
 * Paths are resolved lazily on each call rather than captured at module load, so a
 * test that sets the override after import still gets the right directory.
 */

import { resolve } from "node:path"

import { resolveWebRoot } from "./paths"

/** Directory holding the journal, storage state, traces and the HTML report. */
export function runDir(): string {
  const override = process.env.E2E_RUN_DIR
  if (override && override.trim() !== "") return resolve(override.trim())
  return resolve(resolveWebRoot(), "e2e", ".run")
}

/** The ownership journal. The single source of deletion authority. */
export function journalFile(): string {
  return resolve(runDir(), "run.json")
}

export function storageStateFile(role: string): string {
  return resolve(runDir(), `storage-state.${role}.json`)
}
