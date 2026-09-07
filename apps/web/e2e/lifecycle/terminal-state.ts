/**
 * Run terminal states and the decision that picks one — PURE, RUNNER ONLY.
 *
 * Every judgement here is a function of observed state. No I/O, no client, no
 * clock — so the rules that decide what gets mutated on Review can be tested
 * exhaustively offline, which is the only honest way to test them.
 *
 * ## The three terminal states
 *
 *   CLEANED     A healthy run whose run-owned graph was physically removed.
 *               Still the default and still the goal: we do not want to
 *               accumulate tenants.
 *
 *   RETIRED     A healthy run where immutable audit retention makes physical
 *               deletion incompatible with the domain. Operational capability is
 *               neutralised deterministically; the audit trail is untouched.
 *               RETIRED is NOT partial cleanup — it has its own postconditions
 *               and must satisfy all of them.
 *
 *   QUARANTINED Exceptional recovery of a failed or inconsistent run. Never the
 *               normal outcome of a healthy E2E.
 *
 * ## AUDIT IMMUTABILITY WINS
 *
 * No trigger, constraint, RLS policy or domain invariant is ever weakened to make
 * teardown convenient. When the domain says a row must survive, it survives, and
 * the harness adapts.
 *
 * ## Classification happens BEFORE the first mutation
 *
 * The previous design attempted a delete, caught the immutability error, and read
 * the message. That is exception-as-control-flow: it performs a destructive
 * action in order to ask a read-only question, and it can only recognise the
 * first blocker Postgres happens to name. Here the sequence is
 *
 *     inspect -> classify -> plan -> TOCTOU reread -> mutate -> verify -> finalize
 *
 * and the inspect step is read-only by construction.
 */

import type { RetentionTable } from "./retention-registry"

export type RunTerminalState = "CLEANED" | "RETIRED" | "QUARANTINED"

/**
 * Everything the transport told us about a failed probe.
 *
 * The previous shape kept only `error.message` and threw the rest away. That cost
 * two full diagnostic round-trips on hosted run 260906201436-5ecd5f: PostgREST
 * answered `403` with an empty body, so `message` was the empty string, and the
 * classifier rendered `could not be read ()` — the one fact that would have named
 * the cause immediately, the status code, had already been discarded at capture.
 *
 * Every field is optional because different failure modes populate different
 * ones: a PostgREST error carries `code`/`details`/`hint`, a fetch failure
 * carries only a thrown message, and an empty-bodied HTTP error carries little
 * more than a status.
 */
export type ProbeFailure = Readonly<{
  status?: number
  statusText?: string
  code?: string
  message?: string
  details?: string
  hint?: string
  /** Set when the call threw instead of returning an error object. */
  thrownName?: string
}>

/** One read-only probe of a company-scoped retention table. */
export type RetentionProbe = Readonly<{
  table: string
  mechanism: RetentionTable["mechanism"]
  /** Row count for this company, or null when the table could not be read. */
  rows: number | null
  /** Present only when `rows` is null. */
  failure?: ProbeFailure
}>

/** Empty and whitespace-only values are as useless as absent ones. */
function present(value: string | number | undefined): value is string | number {
  if (value === undefined || value === null) return false
  return typeof value === "number" ? true : value.trim().length > 0
}

/**
 * Render a failure so that it always says something actionable.
 *
 * Never produces `()`. When a field is missing it is omitted; when a field
 * exists but is empty it is rendered as `<empty>`, because "the server sent an
 * empty message" is itself a diagnostic clue and is not the same as "there was
 * no message field at all".
 */
export function describeProbeFailure(failure: ProbeFailure | undefined): string {
  if (!failure) return "no failure detail was captured"

  const parts: string[] = []

  if (present(failure.status)) {
    parts.push(`HTTP ${failure.status}${present(failure.statusText) ? ` ${failure.statusText}` : ""}`)
  }
  if (failure.thrownName) parts.push(`threw ${failure.thrownName}`)
  if (present(failure.code)) parts.push(`code=${failure.code}`)

  // `message` is reported even when empty: an empty body on a 403 is the signal.
  if (failure.message !== undefined) {
    parts.push(`message=${present(failure.message) ? failure.message : "<empty>"}`)
  }
  if (present(failure.details)) parts.push(`details=${failure.details}`)
  if (present(failure.hint)) parts.push(`hint=${failure.hint}`)

  return parts.length > 0 ? parts.join("; ") : "the transport reported a failure with no detail"
}

export type OwnershipFacts = Readonly<{
  runId: string
  /** Journal's project ref, already compared against the environment upstream. */
  supabaseRef: string
  /** Every company this run owns, full UUIDs, from the validated journal. */
  companyIds: readonly string[]
  /** Every auth identity this run owns, full UUIDs, from the validated journal. */
  authUserIds: readonly string[]
}>

export type Classification =
  | Readonly<{ strategy: "CLEANED"; probes: readonly RetentionProbe[] }>
  | Readonly<{
      strategy: "RETIRED"
      /** The non-empty retention tables that forbid physical deletion. */
      blockedBy: readonly RetentionProbe[]
      probes: readonly RetentionProbe[]
    }>
  | Readonly<{ status: "unavailable"; reason: string }>
  | Readonly<{ status: "unusable"; reason: string }>
  | Readonly<{ status: "inconsistent"; reason: string }>

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Decide the terminal strategy for ONE company from its retention probes.
 *
 * Fails closed three ways, because a wrong answer here is a wrong mutation:
 *
 *   - a probe that could not be read is `unavailable`. An unreadable table is
 *     not evidence that it is empty, and treating it as empty would classify a
 *     blocked tenant as CLEANED and send teardown at a delete that must fail;
 *   - a negative or non-integer count is `unusable`;
 *   - ownership facts that are not complete UUIDs are `unusable`. A truncated id
 *     is a different predicate, not a narrower one.
 *
 * Note what is NOT here: any inspection of a delete attempt, any error string,
 * any retry. The classifier never mutates and never infers from failure.
 */
export function classifyTerminalStrategy(
  probes: readonly RetentionProbe[],
  ownership: OwnershipFacts,
): Classification {
  for (const id of [...ownership.companyIds, ...ownership.authUserIds]) {
    if (typeof id !== "string" || !UUID_RE.test(id)) {
      return Object.freeze({
        status: "unusable",
        reason: `ownership carries an id that is not a complete UUID: ${String(id)}`,
      })
    }
  }

  if (probes.length === 0) {
    return Object.freeze({
      status: "unavailable",
      reason: "no retention probe was performed — refusing to assume nothing is retained",
    })
  }

  const unreadable = probes.find((probe) => probe.rows === null)
  if (unreadable) {
    return Object.freeze({
      status: "unavailable",
      reason:
        `retention table ${unreadable.table} could not be read ` +
        `[${describeProbeFailure(unreadable.failure)}]. An unreadable table is not ` +
        `evidence that it is empty.`,
    })
  }

  const malformed = probes.find(
    (probe) => !Number.isInteger(probe.rows) || (probe.rows as number) < 0,
  )
  if (malformed) {
    return Object.freeze({
      status: "unusable",
      reason: `retention table ${malformed.table} returned a nonsensical count`,
    })
  }

  const blockedBy = probes.filter((probe) => (probe.rows as number) > 0)

  return blockedBy.length === 0
    ? Object.freeze({ strategy: "CLEANED", probes })
    : Object.freeze({ strategy: "RETIRED", blockedBy, probes })
}

// ---------------------------------------------------------------------------
// Retirement plan
// ---------------------------------------------------------------------------

export const COMPANY_RETIRED_STATUS = "inactive"
export const PERSON_RETIRED_STATUS = "terminated"

/**
 * Canonical inactive state for a membership.
 *
 * Read from the schema, not invented: `company_members.status` is
 * `check (status in ('active', 'inactive', 'invited'))` in migration 0001, and no
 * later migration alters that constraint.
 */
export const MEMBERSHIP_RETIRED_STATUS = "inactive"

/** The one role whose membership retirement is forbidden by the domain. */
export const PROTECTED_OWNER_ROLE = "owner"

/**
 * Supabase's first-class account disable. `ban_duration` is a Go duration on
 * `AdminUserAttributes`; `'none'` reverses it. Chosen over rotating a password
 * because it is explicit, reversible, verifiable afterwards through
 * `banned_until`, and involves no credential handling at all.
 */
export const AUTH_BAN_DURATION = "876000h"

export type RetirementStep =
  | Readonly<{ kind: "retire-people"; companyId: string }>
  | Readonly<{ kind: "retire-nonowner-memberships"; companyId: string }>
  | Readonly<{ kind: "retire-company"; companyId: string }>
  | Readonly<{ kind: "ban-auth-user"; userId: string }>

export type RetirementPlan = Readonly<{
  runId: string
  companyIds: readonly string[]
  steps: readonly RetirementStep[]
  /** Stated so the evidence explains an absence rather than hiding it. */
  notAttempted: readonly string[]
}>

/**
 * Build the retirement plan from ownership facts alone.
 *
 * ## Why people are targeted by company rather than by id
 *
 * The journal records the fixture's own person rows, but a journey creates more
 * of them through the UI. Rather than require every one to be journalled — which
 * would reintroduce the crash window the ownership journal exists to close — the
 * unit of ownership is the COMPANY. Its id is journalled as a full UUID, and
 * every row scoped by that `company_id` is transitively run-owned. This is
 * exactly the argument physical cleanup already relies on when it lets a company
 * delete cascade.
 *
 * Auth identities get the opposite treatment: they are targeted only by exact
 * journalled UUID, never discovered, because an auth user is not scoped by
 * company and a discovery predicate there could reach somebody else's account.
 *
 * ## What is deliberately not attempted
 *
 * The owner membership stays `active`. `enforce_company_member_owner_invariants`
 * (0071) raises `LAST_ACTIVE_OWNER_REQUIRED` when deactivating a tenant's only
 * owner, and `OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER` for a service-role
 * caller whose `auth.uid()` is null. Both refusals are correct — a tenant may not
 * be left ownerless — and the only ways around them are weakening the invariant
 * or minting a second synthetic owner to retire the first. Neither is
 * acceptable, so the plan does not include the step, and the postconditions
 * assert the membership is unchanged rather than pretending it was handled.
 *
 * An active membership on an account nobody can authenticate as grants nothing,
 * so the ban is what actually removes operational capability.
 */
export function planRetirement(ownership: OwnershipFacts): RetirementPlan {
  const steps: RetirementStep[] = []

  for (const companyId of ownership.companyIds) {
    // People first, memberships second. `enforce_active_membership_people_invariant`
    // (0072) counts people ROWS for an active membership and never reads
    // `people.status`, so terminating people leaves every membership valid; doing
    // it in this order keeps each intermediate state domain-valid rather than
    // relying on the end state.
    steps.push({ kind: "retire-people", companyId })
    steps.push({ kind: "retire-nonowner-memberships", companyId })
    steps.push({ kind: "retire-company", companyId })
  }
  for (const userId of ownership.authUserIds) {
    steps.push({ kind: "ban-auth-user", userId })
  }

  return Object.freeze({
    runId: ownership.runId,
    companyIds: [...ownership.companyIds],
    steps: Object.freeze(steps),
    notAttempted: Object.freeze([
      "the OWNER membership stays active: LAST_ACTIVE_OWNER_REQUIRED (0071) forbids " +
        "deactivating a tenant's only owner, and OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER " +
        "forbids it for a service-role caller whose auth.uid() is null. Non-owner " +
        "memberships ARE deactivated — 0071 returns early when the row does not touch an " +
        "owner, and 0072 skips non-active rows — so the ban is no longer the only thing " +
        "removing their access.",
      "auth user deletion: an auth identity named as an actor on an immutable row cannot be " +
        "deleted (SET NULL is an UPDATE the immutability trigger rejects). Banned, not deleted.",
      "any write to a retention table: audit immutability wins.",
    ]),
  })
}

// ---------------------------------------------------------------------------
// Observed state and postconditions
// ---------------------------------------------------------------------------

export type ObservedCompany = Readonly<{
  companyId: string
  exists: boolean
  status: string | null
  /** Every person row under this company. */
  people: readonly Readonly<{ id: string; status: string }>[]
  /** Every membership under this company. */
  memberships: readonly Readonly<{ userId: string; role: string; status: string }>[]
  /** Retention counts, same registry, taken again after mutation. */
  probes: readonly RetentionProbe[]
}>

export type ObservedAuthUser = Readonly<{
  userId: string
  exists: boolean
  bannedUntil: string | null
}>

export type ObservedState = Readonly<{
  companies: readonly ObservedCompany[]
  authUsers: readonly ObservedAuthUser[]
}>

export type Verdict =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; mismatches: readonly string[] }>

function fail(mismatches: string[], condition: boolean, describe: string): void {
  if (!condition) mismatches.push(describe)
}

/** A stable summary of everything the plan depends on, for the TOCTOU recheck. */
export function baselineFingerprint(observed: ObservedState): string {
  const companies = observed.companies
    .map((company) => {
      const people = [...company.people].map((p) => `${p.id}:${p.status}`).sort()
      const members = [...company.memberships]
        .map((m) => `${m.userId}:${m.role}:${m.status}`)
        .sort()
      const probes = [...company.probes].map((p) => `${p.table}=${p.rows ?? "null"}`).sort()
      return `${company.companyId}|${company.exists}|${company.status ?? "null"}|[${people.join(
        ",",
      )}]|[${members.join(",")}]|[${probes.join(",")}]`
    })
    .sort()

  const users = observed.authUsers
    .map((user) => `${user.userId}:${user.exists}:${user.bannedUntil ?? "unbanned"}`)
    .sort()

  return `companies=[${companies.join(";")}];users=[${users.join(";")}]`
}

/**
 * What RETIRED must mean, verified after the fact.
 *
 * `retentionBefore` is the probe snapshot taken during classification. Audit rows
 * must be **identical** afterwards — not merely non-zero. A count that moved
 * means something wrote to an immutable table during retirement, which would mean
 * the harness itself produced audit noise while claiming to preserve the trail.
 */
export function evaluateRetirementPostconditions(
  observed: ObservedState,
  retentionBefore: ReadonlyMap<string, readonly RetentionProbe[]>,
): Verdict {
  const mismatches: string[] = []

  if (observed.companies.length === 0) {
    return { ok: false, mismatches: ["no company was observed after retirement"] }
  }

  for (const company of observed.companies) {
    const where = `company ${company.companyId}`

    fail(mismatches, company.exists, `${where} no longer exists — retirement is not deletion`)
    fail(
      mismatches,
      company.status === COMPANY_RETIRED_STATUS,
      `${where} status is ${String(company.status)}, expected ${COMPANY_RETIRED_STATUS}`,
    )

    for (const person of company.people) {
      fail(
        mismatches,
        person.status === PERSON_RETIRED_STATUS,
        `${where}: person ${person.id} status is ${person.status}, expected ${PERSON_RETIRED_STATUS}`,
      )
    }

    // The owner stays active BY DESIGN. Asserted so that a future change to the
    // owner invariant surfaces here as a deviation instead of passing silently.
    const owners = company.memberships.filter((m) => m.role === PROTECTED_OWNER_ROLE)
    fail(
      mismatches,
      owners.length > 0,
      `${where}: the owner membership disappeared; retirement must never remove it`,
    )
    fail(
      mismatches,
      owners.every((owner) => owner.status === "active"),
      `${where}: an owner membership is no longer active; LAST_ACTIVE_OWNER_REQUIRED forbids ` +
        `deactivating a tenant's only owner, so this must not have changed`,
    )

    // Non-owner memberships are neutralised directly, so "no operational access"
    // is an observable fact about the domain rather than something inferred from
    // the auth ban alone.
    const nonOwners = company.memberships.filter((m) => m.role !== PROTECTED_OWNER_ROLE)
    for (const membership of nonOwners) {
      fail(
        mismatches,
        membership.status === MEMBERSHIP_RETIRED_STATUS,
        `${where}: ${membership.role} membership for ${membership.userId} is ` +
          `${membership.status}, expected ${MEMBERSHIP_RETIRED_STATUS}`,
      )
    }

    const before = retentionBefore.get(company.companyId)
    if (!before) {
      mismatches.push(`${where}: no pre-retirement retention snapshot to compare against`)
      continue
    }
    for (const priorProbe of before) {
      const now = company.probes.find((probe) => probe.table === priorProbe.table)
      if (!now) {
        mismatches.push(`${where}: retention table ${priorProbe.table} was not re-probed`)
        continue
      }
      fail(
        mismatches,
        now.rows !== null && now.rows === priorProbe.rows,
        `${where}: ${priorProbe.table} went from ${String(priorProbe.rows)} to ` +
          `${String(now.rows)} — immutable audit rows must be identical`,
      )
    }
  }

  for (const user of observed.authUsers) {
    // Absent is acceptable: a run-owned identity with no immutable references may
    // legitimately have been deleted before retirement was chosen.
    if (!user.exists) continue
    fail(
      mismatches,
      user.bannedUntil !== null,
      `auth user ${user.userId} still exists and is not banned — an operational login remains`,
    )
  }

  return mismatches.length === 0 ? { ok: true } : { ok: false, mismatches }
}

/**
 * The journal is finalized only on a verified terminal state.
 *
 * A partial mutation is never RETIRED. While retirement is incomplete the journal
 * is the only record of what this run owns, so it stays exactly where it is —
 * losing it would turn a recoverable partial state into an unrecoverable one.
 */
export function shouldFinalizeJournal(verdict: Verdict): boolean {
  return verdict.ok
}

/**
 * How a failed retirement is reported.
 *
 * Explicitly NOT `RETIRED`. A run that mutated some resources and then stopped is
 * inconsistent, which is the definition of the exceptional state — and calling it
 * healthy would be the single most damaging lie this module could tell.
 */
export function terminalStateForFailedRetirement(): RunTerminalState {
  return "QUARANTINED"
}

/** Strip anything sensitive before a journal is archived as evidence. */
export function redactJournalForArchive(journal: unknown): unknown {
  if (typeof journal !== "object" || journal === null) return journal
  const clone = JSON.parse(JSON.stringify(journal)) as Record<string, unknown>

  if (Array.isArray(clone.users)) {
    clone.users = (clone.users as Array<Record<string, unknown>>).map((user) => {
      const { password: _password, ...rest } = user
      return { ...rest, password: "<redacted>" }
    })
  }

  return clone
}
