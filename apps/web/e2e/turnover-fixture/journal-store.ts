import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"

import {
  assertOwnedJournal,
  plannedJournal,
  type DurableTurnoverJournal,
} from "./lifecycle"

export function createDurableTurnoverJournal(path: string): DurableTurnoverJournal {
  const journal = plannedJournal()
  writeFileSync(path, JSON.stringify(journal, null, 2), { encoding: "utf8", flag: "wx", mode: 0o600 })
  return journal
}
export function readDurableTurnoverJournal(path: string): DurableTurnoverJournal {
  if (!existsSync(path)) throw new Error("TURNOVER_FIXTURE_JOURNAL_MISSING")
  let parsed: DurableTurnoverJournal
  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as DurableTurnoverJournal
  } catch {
    throw new Error("TURNOVER_FIXTURE_JOURNAL_INVALID")
  }
  assertOwnedJournal(parsed)
  return parsed
}

export function replaceDurableTurnoverJournal(
  path: string,
  expectedRevision: number,
  next: DurableTurnoverJournal,
): void {
  const current = readDurableTurnoverJournal(path)
  if (current.revision !== expectedRevision || next.revision !== expectedRevision + 1) {
    throw new Error("TURNOVER_FIXTURE_JOURNAL_REVISION_CONFLICT")
  }
  assertOwnedJournal(next)
  const temporary = `${path}.tmp`
  writeFileSync(temporary, JSON.stringify(next, null, 2), { encoding: "utf8", flag: "wx", mode: 0o600 })
  renameSync(temporary, path)
}
