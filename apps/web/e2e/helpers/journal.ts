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
import type { OwnedTenant, RunManifest, SyntheticUser } from "./run-context"

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
export function openJournal(seed: Omit<RunManifest, "users" | "onboardingCompany">): Journal {
  if (!existsSync(runDir())) mkdirSync(runDir(), { recursive: true, mode: 0o700 })
  const journal: Journal = {
    ...seed,
    onboardingCompany: null,
    users: [],
    owned: [],
    setupComplete: false,
  }
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

/**
 * Record tenant B — the company the onboarding journey created through the UI.
 *
 * Deliberately does NOT touch the tenant-A scalars: `companyId` stays the fixture
 * tenant so every existing reader keeps its meaning. The company still lands in
 * `owned`, which is the only thing teardown deletes from.
 *
 * Called from a spec rather than from setup, because the browser created it. The
 * window between the click and this call is covered by
 * `reconcileOwnedCompanies` in teardown, which finds any company a journalled
 * synthetic user owns and records it before anything is deleted.
 */
export function setOnboardingCompany(journal: Journal, tenant: OwnedTenant): Journal {
  journal.onboardingCompany = tenant
  if (!journal.owned.some((r) => r.kind === "company" && r.id === tenant.companyId)) {
    journal.owned.push({ kind: "company", id: tenant.companyId })
  }
  writeAtomic(journalFile(), JSON.stringify(journal, null, 2))
  return journal
}

/**
 * Record a company found by reconciliation. Idempotent, and never overwrites the
 * tenant-A scalars.
 */
export function recordCompany(journal: Journal, companyId: string): Journal {
  if (journal.owned.some((r) => r.kind === "company" && r.id === companyId)) return journal
  journal.owned.push({ kind: "company", id: companyId })
  writeAtomic(journalFile(), JSON.stringify(journal, null, 2))
  return journal
}

/** Every company this run owns, tenant A first. Full UUIDs only, no inference. */
export function ownedCompanyIds(journal: {
  companyId?: string | null
  owned?: ReadonlyArray<{ kind: string; id?: string }>
}): string[] {
  const ids: string[] = []
  const add = (id: string | null | undefined) => {
    if (typeof id === "string" && id.length > 0 && !ids.includes(id)) ids.push(id)
  }
  add(journal.companyId ?? null)
  for (const resource of journal.owned ?? []) {
    if (resource.kind === "company") add(resource.id)
  }
  return ids
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
