/**
 * One-time quarantine for hosted run 260905235830-c0b9ba — RUNNER ONLY.
 *
 *   npm --workspace apps/web run e2e:quarantine-run     # DRY RUN (default)
 *
 * Executing requires naming the run explicitly:
 *
 *   E2E_QUARANTINE_EXECUTE=260905235830-c0b9ba \
 *     npm --workspace apps/web run e2e:quarantine-run
 *
 * This is deliberately NOT a general cleanup command. It is bound to one run id
 * and one project ref, it asserts an exact expected world before it touches
 * anything, and it will refuse the moment reality differs. Healthy runs continue
 * to be cleaned physically by `e2e:cleanup`; quarantine is the exception that
 * exists only because immutable audit history makes deletion invalid.
 *
 * `activity_events` is never selected for content, never updated and never
 * deleted. Only its count and its two foreign keys are read, so that the
 * postconditions can prove the audit trail is byte-for-byte as it was.
 *
 * All reasoning lives in `quarantine/quarantine-contract.ts`, which is pure and
 * unit-tested. This file is the I/O shell.
 */

import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { adminClient } from "./helpers/admin-client"
import { e2eEnv } from "./helpers/env"
import { journalPath, readJournal } from "./helpers/journal"
import { runDir } from "./helpers/run-paths"
import {
  ABSENT_AUTH_USER_IDS,
  ADMIN_AUTH_USER_ID,
  ADMIN_BAN_DURATION,
  COMPANY_RETIRED_STATUS,
  EMPLOYEE_PERSON_ID,
  EXECUTE_ENV_VAR,
  MANAGER_PERSON_ID,
  OWNER_PERSON_ID,
  PERSON_RETIRED_STATUS,
  QUARANTINE_PROJECT_REF,
  QUARANTINE_RUN_ID,
  TENANT_A_COMPANY_ID,
  TENANT_B_COMPANY_ID,
  baselineFingerprint,
  evaluatePostconditions,
  evaluatePreconditions,
  isExecutionAuthorized,
  redactJournalForArchive,
  shouldRetireJournal,
  type ObservedState,
  type Verdict,
} from "./quarantine/quarantine-contract"

const PERSON_IDS = [OWNER_PERSON_ID, MANAGER_PERSON_ID, EMPLOYEE_PERSON_ID] as const

async function observe(runId: string, projectRef: string): Promise<ObservedState> {
  const db = adminClient()

  const companyA = await db
    .from("companies")
    .select("id, status")
    .eq("id", TENANT_A_COMPANY_ID)
    .maybeSingle()

  const companyB = await db
    .from("companies")
    .select("id")
    .eq("id", TENANT_B_COMPANY_ID)
    .maybeSingle()

  const memberships = await db
    .from("company_members")
    .select("user_id, role, status")
    .eq("company_id", TENANT_A_COMPANY_ID)

  const people = await db
    .from("people")
    .select("id, user_id, status")
    .eq("company_id", TENANT_A_COMPANY_ID)

  // Foreign keys and count only. The audit row's content is never read.
  const events = await db
    .from("activity_events")
    .select("company_id, actor_id")
    .eq("company_id", TENANT_A_COMPANY_ID)

  const admin = await db.auth.admin.getUserById(ADMIN_AUTH_USER_ID)

  const stillPresent: string[] = []
  for (const userId of ABSENT_AUTH_USER_IDS) {
    const probe = await db.auth.admin.getUserById(userId)
    if (probe.data?.user) stillPresent.push(userId)
  }

  const bannedUntil =
    (admin.data?.user as { banned_until?: string | null } | undefined)?.banned_until ?? null

  return Object.freeze({
    projectRef,
    runId,
    companyAExists: Boolean(companyA.data),
    companyAStatus: (companyA.data?.status as string | undefined) ?? null,
    companyBExists: Boolean(companyB.data),
    memberships: (memberships.data ?? []).map((row) => ({
      userId: String(row.user_id),
      role: String(row.role),
      status: String(row.status),
    })),
    people: (people.data ?? []).map((row) => ({
      id: String(row.id),
      linkedUserId: (row.user_id as string | null) ?? null,
      status: String(row.status),
    })),
    activityEventCount: (events.data ?? []).length,
    activityEventCompanyIds: (events.data ?? []).map((row) => String(row.company_id)),
    activityEventActorIds: (events.data ?? []).map(
      (row) => (row.actor_id as string | null) ?? null,
    ),
    adminAuthExists: Boolean(admin.data?.user),
    adminBannedUntil: bannedUntil,
    absentAuthUserIdsStillPresent: stillPresent,
  })
}

function report(title: string, verdict: Verdict): void {
  if (verdict.ok) {
    console.log(`[quarantine] ${title}: OK`)
    return
  }
  console.error(`[quarantine] ${title}: MISMATCH`)
  for (const mismatch of verdict.mismatches) console.error(`  - ${mismatch}`)
}

function printPlan(): void {
  console.log("\n[quarantine] intended mutations, in order:")
  console.log(`  1. people ${OWNER_PERSON_ID}   status -> ${PERSON_RETIRED_STATUS}`)
  console.log(`  2. people ${MANAGER_PERSON_ID}   status -> ${PERSON_RETIRED_STATUS}`)
  console.log(`  3. people ${EMPLOYEE_PERSON_ID}   status -> ${PERSON_RETIRED_STATUS}`)
  console.log(`  4. companies ${TENANT_A_COMPANY_ID}   status -> ${COMPANY_RETIRED_STATUS}`)
  console.log(`  5. auth user ${ADMIN_AUTH_USER_ID}   ban_duration -> ${ADMIN_BAN_DURATION}`)
  console.log("\n[quarantine] deliberately NOT attempted:")
  console.log(
    `  x. company_members ${ADMIN_AUTH_USER_ID} status -> inactive\n` +
      "     Blocked by design. enforce_company_member_owner_invariants (0071) raises\n" +
      "     23514 LAST_ACTIVE_OWNER_REQUIRED for a tenant's only owner, and 42501\n" +
      "     OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER for a service-role caller.\n" +
      "     The membership stays active; the ban is what removes access.",
  )
  console.log("\n[quarantine] never touched: activity_events (immutable audit history)\n")
}

/** Each step stops the sequence on failure. No rollback ever touches audit rows. */
async function mutate(): Promise<{ ok: boolean; applied: string[]; failure?: string }> {
  const db = adminClient()
  const applied: string[] = []

  for (const personId of PERSON_IDS) {
    const { error } = await db
      .from("people")
      .update({ status: PERSON_RETIRED_STATUS })
      .eq("id", personId)
      .eq("company_id", TENANT_A_COMPANY_ID)

    if (error) {
      return { ok: false, applied, failure: `people ${personId}: ${error.message}` }
    }
    applied.push(`people ${personId} -> ${PERSON_RETIRED_STATUS}`)
  }

  const company = await db
    .from("companies")
    .update({ status: COMPANY_RETIRED_STATUS })
    .eq("id", TENANT_A_COMPANY_ID)

  if (company.error) {
    return { ok: false, applied, failure: `companies: ${company.error.message}` }
  }
  applied.push(`companies ${TENANT_A_COMPANY_ID} -> ${COMPANY_RETIRED_STATUS}`)

  const ban = await db.auth.admin.updateUserById(ADMIN_AUTH_USER_ID, {
    ban_duration: ADMIN_BAN_DURATION,
  })

  if (ban.error) {
    return { ok: false, applied, failure: `auth ban: ${ban.error.message}` }
  }
  applied.push(`auth user ${ADMIN_AUTH_USER_ID} banned for ${ADMIN_BAN_DURATION}`)

  return { ok: true, applied }
}

/** Archive redacted, then retire the operational journal. Only after success. */
function finalizeJournal(journal: unknown): string {
  const archiveDir = resolve(runDir(), "archive")
  if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true, mode: 0o700 })

  const archivePath = resolve(archiveDir, `${QUARANTINE_RUN_ID}.quarantined.json`)
  writeFileSync(archivePath, JSON.stringify(redactJournalForArchive(journal), null, 2), {
    mode: 0o600,
  })

  // Renamed rather than deleted: the operational path is freed for a future run,
  // and nothing is destroyed.
  renameSync(journalPath(), resolve(archiveDir, `${QUARANTINE_RUN_ID}.run.json.retired`))

  return archivePath
}

async function main(): Promise<void> {
  const env = e2eEnv()
  const journal = readJournal()

  console.log(`[quarantine] target run  : ${QUARANTINE_RUN_ID}`)
  console.log(`[quarantine] target ref  : ${QUARANTINE_PROJECT_REF}`)

  if (env.supabaseRef !== QUARANTINE_PROJECT_REF) {
    console.error(
      `[quarantine] QUARANTINE_PRECONDITION_MISMATCH: environment points at ` +
        `${env.supabaseRef}. Refusing.`,
    )
    process.exitCode = 1
    return
  }

  if (!journal) {
    console.error(`[quarantine] no ownership journal at ${journalPath()}. Refusing.`)
    process.exitCode = 1
    return
  }

  if (journal.runId !== QUARANTINE_RUN_ID) {
    console.error(
      `[quarantine] QUARANTINE_PRECONDITION_MISMATCH: journal run is ${journal.runId}, ` +
        `this command only remediates ${QUARANTINE_RUN_ID}. Refusing.`,
    )
    process.exitCode = 1
    return
  }

  const before = await observe(journal.runId, env.supabaseRef)
  const preconditions = evaluatePreconditions(before)
  report("preconditions", preconditions)

  if (!preconditions.ok) {
    console.error(
      "\n[quarantine] QUARANTINE_PRECONDITION_MISMATCH — no mutation performed.\n" +
        "The diagnosed world no longer matches Review, so the planned mutations are\n" +
        "no longer known to be safe. Re-diagnose before proceeding.",
    )
    process.exitCode = 1
    return
  }

  printPlan()

  if (!isExecutionAuthorized(process.env)) {
    console.log(
      `[quarantine] DRY RUN — nothing was mutated.\n` +
        `To execute, re-run with:\n\n` +
        `  ${EXECUTE_ENV_VAR}=${QUARANTINE_RUN_ID} \\\n` +
        `    npm --workspace apps/web run e2e:quarantine-run\n`,
    )
    return
  }

  // TOCTOU: the approval above was granted for a specific observed world. Re-read
  // it and refuse if anything moved in between.
  const recheck = await observe(journal.runId, env.supabaseRef)
  if (baselineFingerprint(recheck) !== baselineFingerprint(before)) {
    console.error(
      "[quarantine] BASELINE_CHANGED between preflight and execution. Refusing to\n" +
        "apply an approval that was granted for a different state.",
    )
    process.exitCode = 1
    return
  }

  console.log("[quarantine] executing...")
  const result = await mutate()
  for (const step of result.applied) console.log(`  applied: ${step}`)

  if (!result.ok) {
    console.error(`[quarantine] STOPPED after a failed step: ${result.failure}`)
    console.error(
      "[quarantine] Partial state is listed above. The journal was KEPT. No rollback\n" +
        "was attempted, because rolling back would mean touching audit history.",
    )
    process.exitCode = 1
    return
  }

  const after = await observe(journal.runId, env.supabaseRef)
  const postconditions = evaluatePostconditions(after)
  report("postconditions", postconditions)

  if (!shouldRetireJournal(postconditions)) {
    console.error("[quarantine] postconditions failed — journal KEPT for a further attempt.")
    process.exitCode = 1
    return
  }

  const archivePath = finalizeJournal(journal)
  console.log(`[quarantine] journal archived (redacted) to ${archivePath}`)
  console.log("[quarantine] QUARANTINE_COMPLETE — the run directory is free for a new run.")
}

if (process.argv[1] && /quarantine-run\.(ts|js|mjs|cjs)$/.test(process.argv[1])) {
  void main()
}
