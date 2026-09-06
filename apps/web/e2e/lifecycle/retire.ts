/**
 * Terminal-state execution — RUNNER ONLY. The I/O shell around a pure contract.
 *
 * Reads Review, hands the observations to `terminal-state.ts`, and applies only
 * what that pure module authorizes. Nothing here decides anything.
 *
 * Sequence, in order, with no shortcuts:
 *
 *     probe (read-only) -> classify -> plan -> TOCTOU reread -> mutate -> verify
 *
 * The probe step never calls an audited RPC. Every retention read is a plain
 * PostgREST `count` with `head: true`, which is important: several administrative
 * *read* RPCs append an `activity_events` row through
 * `audit_secure_administrative_read` (0062:55), so classifying with one of those
 * would create the very audit evidence it is trying to detect.
 */

import { adminClient } from "../helpers/admin-client"
import {
  COMPANY_RETENTION_TABLES,
  type RetentionTable,
} from "./retention-registry"
import {
  AUTH_BAN_DURATION,
  COMPANY_RETIRED_STATUS,
  PERSON_RETIRED_STATUS,
  baselineFingerprint,
  classifyTerminalStrategy,
  evaluateRetirementPostconditions,
  planRetirement,
  type Classification,
  type ObservedAuthUser,
  type ObservedCompany,
  type ObservedState,
  type OwnershipFacts,
  type ProbeFailure,
  type RetentionProbe,
  type RetirementPlan,
  type Verdict,
} from "./terminal-state"

/**
 * Capture every field the transport gave us — see `ProbeFailure`.
 *
 * A table that cannot be read is reported as unreadable, never as empty: a
 * missing count treated as zero would be an assumption dressed up as a
 * measurement, and it is exactly what would let a blocked tenant be classified
 * CLEANED.
 */
function toFailure(response: {
  status?: number
  statusText?: string
  error?: { code?: string; message?: string; details?: string; hint?: string } | null
}): ProbeFailure {
  return {
    status: response.status,
    statusText: response.statusText,
    code: response.error?.code,
    message: response.error?.message,
    details: response.error?.details,
    hint: response.error?.hint,
  }
}

function thrownFailure(thrown: unknown): ProbeFailure {
  const error = thrown as { name?: string; message?: string } | undefined
  return { thrownName: error?.name ?? "Error", message: error?.message }
}

async function probeDirect(companyId: string, entry: RetentionTable): Promise<RetentionProbe> {
  try {
    const response = await adminClient()
      .from(entry.table)
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)

    if (response.error) {
      return {
        table: entry.table,
        mechanism: entry.mechanism,
        rows: null,
        failure: toFailure(response),
      }
    }
    return { table: entry.table, mechanism: entry.mechanism, rows: response.count ?? 0 }
  } catch (thrown) {
    return {
      table: entry.table,
      mechanism: entry.mechanism,
      rows: null,
      failure: thrownFailure(thrown),
    }
  }
}

/** Probe every retention table with a direct head-count. */
export async function probeCompanyRetention(companyId: string): Promise<RetentionProbe[]> {
  const probes: RetentionProbe[] = []
  for (const entry of COMPANY_RETENTION_TABLES) probes.push(await probeDirect(companyId, entry))
  return probes
}

async function observeCompany(companyId: string): Promise<ObservedCompany> {
  const db = adminClient()

  const company = await db
    .from("companies")
    .select("id, status")
    .eq("id", companyId)
    .maybeSingle()

  const people = await db.from("people").select("id, status").eq("company_id", companyId)
  const members = await db
    .from("company_members")
    .select("user_id, role, status")
    .eq("company_id", companyId)

  return {
    companyId,
    exists: Boolean(company.data),
    status: (company.data?.status as string | undefined) ?? null,
    people: (people.data ?? []).map((row) => ({
      id: String(row.id),
      status: String(row.status),
    })),
    memberships: (members.data ?? []).map((row) => ({
      userId: String(row.user_id),
      role: String(row.role),
      status: String(row.status),
    })),
    probes: await probeCompanyRetention(companyId),
  }
}

async function observeAuthUser(userId: string): Promise<ObservedAuthUser> {
  const { data, error } = await adminClient().auth.admin.getUserById(userId)
  if (error) {
    if (/not.?found/i.test(error.message)) return { userId, exists: false, bannedUntil: null }
    // Unknown error: report as existing-and-unbanned so postconditions fail
    // closed rather than quietly accepting an unverifiable identity.
    return { userId, exists: true, bannedUntil: null }
  }
  const user = data?.user as { banned_until?: string | null } | undefined
  return {
    userId,
    exists: Boolean(data?.user),
    bannedUntil: user?.banned_until ?? null,
  }
}

export async function observeRunState(ownership: OwnershipFacts): Promise<ObservedState> {
  const companies: ObservedCompany[] = []
  for (const companyId of ownership.companyIds) companies.push(await observeCompany(companyId))

  const authUsers: ObservedAuthUser[] = []
  for (const userId of ownership.authUserIds) authUsers.push(await observeAuthUser(userId))

  return { companies, authUsers }
}

/**
 * Decide the terminal strategy across every company this run owns.
 *
 * If ANY company is blocked, the whole run retires. Mixing strategies would leave
 * a run half-deleted and half-retired, with no single terminal state to report
 * and no coherent evidence — worse than retiring one tenant that could have been
 * deleted.
 */
export function classifyRun(
  observed: ObservedState,
  ownership: OwnershipFacts,
): Classification {
  if (ownership.companyIds.length === 0) {
    return classifyTerminalStrategy(
      // No company means nothing can be retained against one. The classifier
      // still refuses an empty probe set, so answer it explicitly.
      [{ table: "(no company owned)", mechanism: "immutable-trigger", rows: 0 }],
      ownership,
    )
  }

  const all: RetentionProbe[] = []
  for (const companyId of ownership.companyIds) {
    const company = observed.companies.find((candidate) => candidate.companyId === companyId)
    if (!company) {
      return Object.freeze({
        status: "inconsistent",
        reason: `company ${companyId} is owned by the journal but was not observed`,
      })
    }
    // A company the journal owns but that no longer exists is not a blocker; its
    // rows are gone with it.
    if (!company.exists) continue
    all.push(...company.probes)
  }

  if (all.length === 0) {
    // Every owned company is already absent — nothing left to delete or retire.
    return Object.freeze({ strategy: "CLEANED", probes: [] as RetentionProbe[] })
  }

  return classifyTerminalStrategy(all, ownership)
}

export type RetirementOutcome = Readonly<{
  ok: boolean
  applied: readonly string[]
  failure?: string
  postconditions?: Verdict
}>

/**
 * Apply the plan. Stops at the first failure and never rolls back.
 *
 * There is no rollback because the only way to undo a retirement step would be to
 * touch rows the domain protects, and because a partial state that is honestly
 * reported is recoverable while a partial state that was "cleaned up" is not.
 */
export async function executeRetirement(
  plan: RetirementPlan,
  retentionBefore: ReadonlyMap<string, readonly RetentionProbe[]>,
  ownership: OwnershipFacts,
): Promise<RetirementOutcome> {
  const db = adminClient()
  const applied: string[] = []

  for (const step of plan.steps) {
    if (step.kind === "retire-people") {
      const { error } = await db
        .from("people")
        .update({ status: PERSON_RETIRED_STATUS })
        .eq("company_id", step.companyId)
      if (error) {
        return { ok: false, applied, failure: `people of ${step.companyId}: ${error.message}` }
      }
      applied.push(`people of company ${step.companyId} -> ${PERSON_RETIRED_STATUS}`)
      continue
    }

    if (step.kind === "retire-company") {
      const { error } = await db
        .from("companies")
        .update({ status: COMPANY_RETIRED_STATUS })
        .eq("id", step.companyId)
      if (error) {
        return { ok: false, applied, failure: `company ${step.companyId}: ${error.message}` }
      }
      applied.push(`company ${step.companyId} -> ${COMPANY_RETIRED_STATUS}`)
      continue
    }

    // ban-auth-user. Only ids the journal owns ever reach this line.
    const probe = await adminClient().auth.admin.getUserById(step.userId)
    if (!probe.data?.user) {
      applied.push(`auth user ${step.userId} already absent — nothing to ban`)
      continue
    }
    const { error } = await db.auth.admin.updateUserById(step.userId, {
      ban_duration: AUTH_BAN_DURATION,
    })
    if (error) {
      return { ok: false, applied, failure: `ban ${step.userId}: ${error.message}` }
    }
    applied.push(`auth user ${step.userId} banned`)
  }

  const after = await observeRunState(ownership)
  const postconditions = evaluateRetirementPostconditions(after, retentionBefore)

  return { ok: postconditions.ok, applied, postconditions }
}

/** Snapshot the probes per company, for the postcondition comparison. */
export function retentionSnapshot(
  observed: ObservedState,
): Map<string, readonly RetentionProbe[]> {
  const snapshot = new Map<string, readonly RetentionProbe[]>()
  for (const company of observed.companies) snapshot.set(company.companyId, company.probes)
  return snapshot
}

export { baselineFingerprint, planRetirement }
