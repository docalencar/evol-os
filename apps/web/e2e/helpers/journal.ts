/**
 * Run ownership journal — RUNNER ONLY.
 *
 * The previous design wrote the manifest only after the whole fixture succeeded.
 * When setup crashed part-way, teardown reported "no run manifest; nothing owned
 * by this run to remove" and a synthetic auth user was stranded. A record written
 * after the fact cannot describe a crash that happened before it.
 *
 * So the journal is created **before the first Review mutation** and is appended
 * to immediately after each resource is created. Every write is atomic
 * (temp file → rename), so a crash mid-write leaves the previous good state
 * rather than a truncated file.
 *
 * The journal holds synthetic passwords and is therefore sensitive: it lives in
 * the gitignored run directory at mode 600 and is deleted at the end of a clean
 * run.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { journalFile, runDir } from "./run-paths"
import type { RunManifest, SyntheticUser } from "./run-context"

/** Resource kinds the journal can own, in the order they must be destroyed. */
export type OwnedResource =
  | { kind: "company"; id: string }
  | { kind: "membership"; companyId: string; userId: string }
  | { kind: "person"; id: string }
  | { kind: "auth.user"; id: string }

export type Journal = RunManifest & {
  /** Append-only ledger. Teardown works from this, not from inference. */
  owned: OwnedResource[]
  /** Set once setup finished; a crashed run keeps `false`. */
  setupComplete: boolean
}

function writeAtomic(path: string, contents: string): void {
  const temp = `${path}.tmp`
  writeFileSync(temp, contents, { mode: 0o600 })
  renameSync(temp, path)
}

export function journalPath(): string {
  return journalFile()
}

/**
 * Create the journal. Called before anything is created on Review, so that even
 * an immediate failure leaves a file teardown can act on.
 */
export function openJournal(seed: Omit<RunManifest, "users">): Journal {
  if (!existsSync(runDir())) mkdirSync(runDir(), { recursive: true, mode: 0o700 })
  const journal: Journal = { ...seed, users: [], owned: [], setupComplete: false }
  writeAtomic(journalFile(), JSON.stringify(journal, null, 2))
  return journal
}

/** Persist immediately. Every caller must treat this as part of the mutation. */
export function record(journal: Journal, resource: OwnedResource): Journal {
  journal.owned.push(resource)
  writeAtomic(journalFile(), JSON.stringify(journal, null, 2))
  return journal
}

export function recordUser(journal: Journal, user: SyntheticUser): Journal {
  journal.users.push(user)
  journal.owned.push({ kind: "auth.user", id: user.userId })
  writeAtomic(journalFile(), JSON.stringify(journal, null, 2))
  return journal
}

/** Replace a user entry once later steps learn its person id. */
export function updateUser(journal: Journal, updated: SyntheticUser): Journal {
  journal.users = journal.users.map((user) => (user.userId === updated.userId ? updated : user))
  writeAtomic(journalFile(), JSON.stringify(journal, null, 2))
  return journal
}

export function setCompany(
  journal: Journal,
  company: { id: string; name: string; slug: string },
): Journal {
  journal.companyId = company.id
  journal.companyName = company.name
  journal.companySlug = company.slug
  journal.owned.push({ kind: "company", id: company.id })
  writeAtomic(journalFile(), JSON.stringify(journal, null, 2))
  return journal
}

export function markSetupComplete(journal: Journal): Journal {
  journal.setupComplete = true
  writeAtomic(journalFile(), JSON.stringify(journal, null, 2))
  return journal
}

export function readJournal(): Journal | null {
  if (!existsSync(journalFile())) return null
  try {
    return JSON.parse(readFileSync(journalFile(), "utf8")) as Journal
  } catch {
    return null
  }
}

export function discardJournal(): void {
  if (existsSync(journalFile())) rmSync(journalFile(), { force: true })
}
