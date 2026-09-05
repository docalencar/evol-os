/**
 * Run identity — RUNNER ONLY.
 *
 * Every resource the harness creates carries the run id, so teardown can target
 * exactly what this run owns and nothing else. Pre-existing Review data is never
 * a deletion candidate.
 */

import { randomBytes } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { journalFile, runDir, storageStateFile } from "./run-paths"



/**
 * Roles the harness bootstraps.
 *
 * `admin`, `manager` and `employee` belong to the run's fixture tenant (tenant A),
 * created by `createTenantFixture`.
 *
 * `onboarding` is deliberately different: it is created with **no membership at
 * all**, because `create_company_with_owner` refuses a caller who already has an
 * active one. It is the only identity that can walk the real first-access
 * journey, and the company it creates through the UI becomes tenant B — the
 * foreign tenant the isolation proof needs. No second fixture company exists.
 */
export type SyntheticRole = "admin" | "manager" | "employee" | "onboarding"

export type SyntheticUser = Readonly<{
  role: SyntheticRole
  /** Corporate role actually written to `company_members.role`. */
  membershipRole: "owner" | "admin" | "hr" | "manager" | "employee"
  email: string
  userId: string
  personId: string | null
  fullName: string
  /**
   * Per-run throwaway password. Lives only in the untracked, 0600 run manifest so
   * the specs can drive a real UI login. Never printed, never committed, never
   * written to evidence, and the account is deleted at teardown.
   */
  password: string
}>

/**
 * A tenant this run owns. Tenant A is written by the fixture; tenant B is written
 * by the onboarding spec once the browser has actually created it.
 */
export type OwnedTenant = Readonly<{
  companyId: string
  companyName: string
  /** Null for tenant B: the slug is generated server-side and never displayed. */
  companySlug: string | null
  /** The auth user that owns it — always one of this run's synthetic identities. */
  ownerUserId: string
}>

export type RunManifest = {
  runId: string
  createdAt: string
  baseUrl: string
  supabaseRef: string
  /** Tenant A. Kept as scalars so the E2E-0 manifest shape is unchanged. */
  companyId: string | null
  companySlug: string | null
  companyName: string | null
  /**
   * Tenant B — created through the real onboarding UI by the `onboarding`
   * identity, so it exists only after spec 02 has run. Written by the spec, not
   * by global setup, because a journey action is never bootstrap data.
   */
  onboardingCompany: OwnedTenant | null
  users: SyntheticUser[]
}

/**
 * Run id: short, lowercase, filesystem- and email-safe, and unique enough that two
 * concurrent runs never collide on the company slug.
 */
export function newRunId(): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(2, 14)
  return `${stamp}-${randomBytes(3).toString("hex")}`
}

export function ensureRunDir(): void {
  if (!existsSync(runDir())) mkdirSync(runDir(), { recursive: true, mode: 0o700 })
}

/**
 * Ownership is written through `helpers/journal.ts`, which appends after every
 * mutation. This reader exists for specs, which only need the finished shape.
 */

export function readManifest(): RunManifest {
  if (!existsSync(journalFile())) {
    throw new Error(
      "E2E_RUN_MANIFEST_MISSING: global setup did not complete. Run the full " +
        "Playwright command rather than a single spec in isolation.",
    )
  }
  return JSON.parse(readFileSync(journalFile(), "utf8")) as RunManifest
}

export function storageStatePath(role: SyntheticRole): string {
  return storageStateFile(role)
}

export function syntheticEmail(runId: string, role: SyntheticRole, domain: string): string {
  return `e2e+${runId}-${role}@${domain}`
}

/**
 * Per-run password. Generated fresh, held only in memory and in the untracked run
 * directory, never printed and never committed.
 */
export function newSyntheticPassword(): string {
  return `E2e!${randomBytes(18).toString("base64url")}`
}
