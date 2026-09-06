/**
 * The quarantine decision logic for hosted run 260905235830-c0b9ba — PURE.
 *
 * Every judgement the runner makes lives here as a function of observed state, so
 * it can be tested exhaustively without a control plane. The I/O layer in
 * `../quarantine-run.ts` only reads Review, calls these, and applies the writes
 * they authorize.
 *
 * ## Why this run cannot simply be deleted
 *
 * Spec 04 opened a person profile as tenant A's admin. That reached
 * `read_assessment_administratively`, which writes an `activity_events` row
 * through `audit_secure_administrative_read` *before* it checks the target. The
 * row is legitimate audit history, and `activity_events` carries BEFORE UPDATE
 * and BEFORE DELETE triggers that always raise. Because the table references
 * `companies` (ON DELETE CASCADE) and `auth.users` (ON DELETE SET NULL — an
 * UPDATE), both the company and the actor became permanently undeletable.
 *
 * Quarantine is therefore retirement, not erasure. The audit row is never read
 * for content, never updated and never deleted.
 *
 * ## The one target state that is NOT reachable
 *
 * The intended end state included `company_members.status = 'inactive'` for the
 * owner. That is impossible, by deliberate domain design, and the runner does not
 * try:
 *
 *   `enforce_company_member_owner_invariants` (migration 0071) is a BEFORE
 *   INSERT OR UPDATE OR DELETE trigger on `company_members`. Deactivating the
 *   owner sets `v_removes_active_owner`, and company A has exactly one owner, so
 *   it raises `23514 LAST_ACTIVE_OWNER_REQUIRED`. Independently, the service role
 *   reaches Postgres with `auth.uid()` NULL, so `v_actor_is_active_owner` is
 *   false and it raises `42501 OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER` first.
 *
 * Both refusals are correct: a tenant may not be left ownerless. The only ways
 * around them are to weaken the invariant or to create a second synthetic owner
 * purely to retire the first — one forbidden, the other adding synthetic data in
 * the name of removing it. So the membership stays `active`, deliberately, and
 * the postconditions assert that it is still exactly as found. The security
 * objective is met by the ban: an active membership belonging to an account
 * nobody can authenticate as grants nothing.
 */

export const QUARANTINE_RUN_ID = "260905235830-c0b9ba"
export const QUARANTINE_PROJECT_REF = "rwfvxvbzaosgcyfxdjpt"

export const TENANT_A_COMPANY_ID = "4324eada-975a-4602-9a8b-d8d6b604d540"
export const TENANT_B_COMPANY_ID = "221f2ba2-49ef-4f60-b013-8e04a9817168"
export const ADMIN_AUTH_USER_ID = "425a20b8-3cb6-4ca1-b321-dccb0ed934ff"

export const OWNER_PERSON_ID = "b56edf96-bc98-462c-8a19-5b27c712c1b0"
export const MANAGER_PERSON_ID = "8df07d3b-d859-40be-81bb-5c27348aece0"
export const EMPLOYEE_PERSON_ID = "0ef6a15e-85f4-4be3-b359-8f2c3a594c4a"

export const ABSENT_AUTH_USER_IDS = [
  "08ad64ba-4320-4c62-a0ae-73f70522ca9c", // manager
  "4b22609b-fa15-44b0-ba7f-0c938bcf60db", // employee
  "b7538903-c4ca-47c9-a9b2-73a9d90069fa", // onboarding (tenant B owner)
] as const

/**
 * Domain states, read from the CHECK constraints in migration 0001. No later
 * migration alters any of them.
 *
 *   companies.status      in ('active', 'inactive', 'trial')
 *   company_members.status in ('active', 'inactive', 'invited')
 *   people.status         in ('active', 'inactive', 'on_leave', 'terminated')
 */
export const COMPANY_RETIRED_STATUS = "inactive"
export const PERSON_RETIRED_STATUS = "terminated"

/**
 * Supabase's first-class account disable. `ban_duration` is a Go duration string
 * on `AdminUserAttributes` in the installed @supabase/auth-js, and `'none'`
 * reverses it — so this is explicit, reversible, and needs no password handling.
 * 876000h is 100 years.
 */
export const ADMIN_BAN_DURATION = "876000h"

export type PersonState = Readonly<{
  id: string
  linkedUserId: string | null
  status: string
}>

export type MembershipState = Readonly<{
  userId: string
  role: string
  status: string
}>

/** Everything the runner reads before it is allowed to decide anything. */
export type ObservedState = Readonly<{
  projectRef: string
  runId: string
  companyAExists: boolean
  companyAStatus: string | null
  companyBExists: boolean
  memberships: readonly MembershipState[]
  people: readonly PersonState[]
  /** Count only. Contents are never read — this is audit history. */
  activityEventCount: number
  activityEventCompanyIds: readonly string[]
  activityEventActorIds: readonly (string | null)[]
  adminAuthExists: boolean
  adminBannedUntil: string | null
  absentAuthUserIdsStillPresent: readonly string[]
}>

export type Verdict =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; mismatches: readonly string[] }>

function check(mismatches: string[], condition: boolean, describe: string): void {
  if (!condition) mismatches.push(describe)
}

function person(observed: ObservedState, id: string): PersonState | undefined {
  return observed.people.find((candidate) => candidate.id === id)
}

/**
 * The state the runner must find before it may mutate anything.
 *
 * Deliberately exact rather than permissive. If Review does not look precisely
 * like the state that was diagnosed, the diagnosis no longer describes reality
 * and the planned mutations are no longer known to be safe.
 */
export function evaluatePreconditions(observed: ObservedState): Verdict {
  const mismatches: string[] = []

  check(
    mismatches,
    observed.projectRef === QUARANTINE_PROJECT_REF,
    `project ref is ${observed.projectRef}, expected ${QUARANTINE_PROJECT_REF}`,
  )
  check(
    mismatches,
    observed.runId === QUARANTINE_RUN_ID,
    `journal run id is ${observed.runId}, expected ${QUARANTINE_RUN_ID}`,
  )

  check(mismatches, observed.companyAExists, "company A is missing")
  check(
    mismatches,
    observed.companyAStatus === "active",
    `company A status is ${String(observed.companyAStatus)}, expected active`,
  )
  check(mismatches, !observed.companyBExists, "company B unexpectedly exists")

  check(
    mismatches,
    observed.memberships.length === 1,
    `company A has ${observed.memberships.length} membership(s), expected exactly 1`,
  )
  const owner = observed.memberships[0]
  if (owner) {
    check(
      mismatches,
      owner.userId === ADMIN_AUTH_USER_ID,
      `owner membership belongs to ${owner.userId}, expected ${ADMIN_AUTH_USER_ID}`,
    )
    check(mismatches, owner.role === "owner", `membership role is ${owner.role}, expected owner`)
    check(
      mismatches,
      owner.status === "active",
      `membership status is ${owner.status}, expected active`,
    )
  }

  check(
    mismatches,
    observed.people.length === 3,
    `company A has ${observed.people.length} people, expected exactly 3`,
  )

  const ownerPerson = person(observed, OWNER_PERSON_ID)
  check(mismatches, Boolean(ownerPerson), `owner person ${OWNER_PERSON_ID} is missing`)
  if (ownerPerson) {
    check(
      mismatches,
      ownerPerson.linkedUserId === ADMIN_AUTH_USER_ID,
      `owner person links to ${String(ownerPerson.linkedUserId)}, expected the admin`,
    )
    check(
      mismatches,
      ownerPerson.status === "active",
      `owner person status is ${ownerPerson.status}, expected active`,
    )
  }

  for (const [label, id] of [
    ["manager", MANAGER_PERSON_ID],
    ["employee", EMPLOYEE_PERSON_ID],
  ] as const) {
    const found = person(observed, id)
    check(mismatches, Boolean(found), `${label} person ${id} is missing`)
    if (found) {
      // Their auth users were deleted, and people.user_id is ON DELETE SET NULL,
      // which is exactly why these rows survived their memberships.
      check(
        mismatches,
        found.linkedUserId === null,
        `${label} person links to ${String(found.linkedUserId)}, expected NULL`,
      )
      check(
        mismatches,
        found.status === "active",
        `${label} person status is ${found.status}, expected active`,
      )
    }
  }

  check(
    mismatches,
    observed.activityEventCount === 1,
    `expected exactly 1 activity_event, found ${observed.activityEventCount}`,
  )
  check(
    mismatches,
    observed.activityEventCompanyIds.every((id) => id === TENANT_A_COMPANY_ID),
    "an activity_event belongs to a company other than tenant A",
  )
  check(
    mismatches,
    observed.activityEventActorIds.every((id) => id === ADMIN_AUTH_USER_ID),
    "an activity_event names an actor other than the admin",
  )

  check(mismatches, observed.adminAuthExists, "admin auth user is missing")
  check(
    mismatches,
    observed.adminBannedUntil === null,
    "admin auth user is already banned — quarantine may have already run",
  )
  check(
    mismatches,
    observed.absentAuthUserIdsStillPresent.length === 0,
    `auth users expected to be gone still exist: ${observed.absentAuthUserIdsStillPresent.join(", ")}`,
  )

  return mismatches.length === 0 ? { ok: true } : { ok: false, mismatches }
}

/**
 * A stable summary of everything the plan depends on.
 *
 * Compared immediately before mutation against the value taken during preflight.
 * Approval is granted for a specific observed world; if that world moved in
 * between, the approval no longer applies to it.
 */
export function baselineFingerprint(observed: ObservedState): string {
  const people = [...observed.people]
    .map((p) => `${p.id}:${p.linkedUserId ?? "null"}:${p.status}`)
    .sort()
  const memberships = [...observed.memberships]
    .map((m) => `${m.userId}:${m.role}:${m.status}`)
    .sort()

  return [
    observed.projectRef,
    observed.runId,
    `companyA=${observed.companyAExists}:${observed.companyAStatus ?? "null"}`,
    `companyB=${observed.companyBExists}`,
    `memberships=[${memberships.join("|")}]`,
    `people=[${people.join("|")}]`,
    `events=${observed.activityEventCount}`,
    `admin=${observed.adminAuthExists}:${observed.adminBannedUntil ?? "unbanned"}`,
    `absent=[${[...observed.absentAuthUserIdsStillPresent].sort().join("|")}]`,
  ].join(";")
}

/** What the world must look like once quarantine has succeeded. */
export function evaluatePostconditions(observed: ObservedState): Verdict {
  const mismatches: string[] = []

  check(mismatches, observed.companyAExists, "company A must still exist — this is retirement")
  check(
    mismatches,
    observed.companyAStatus === COMPANY_RETIRED_STATUS,
    `company A status is ${String(observed.companyAStatus)}, expected ${COMPANY_RETIRED_STATUS}`,
  )
  check(mismatches, !observed.companyBExists, "company B must remain absent")

  // Unchanged BY DESIGN: see the module header. Asserted so that a future change
  // to the owner invariant shows up here as a deviation rather than passing
  // silently.
  check(
    mismatches,
    observed.memberships.length === 1,
    `expected the single owner membership to remain, found ${observed.memberships.length}`,
  )
  const owner = observed.memberships[0]
  if (owner) {
    check(
      mismatches,
      owner.userId === ADMIN_AUTH_USER_ID && owner.role === "owner",
      "the owner membership identity changed",
    )
    check(
      mismatches,
      owner.status === "active",
      `owner membership status is ${owner.status}; it must remain active because ` +
        `LAST_ACTIVE_OWNER_REQUIRED forbids deactivating a tenant's only owner`,
    )
  }

  check(mismatches, observed.people.length === 3, "an unexpected person row appeared or vanished")
  for (const id of [OWNER_PERSON_ID, MANAGER_PERSON_ID, EMPLOYEE_PERSON_ID]) {
    const found = person(observed, id)
    check(mismatches, Boolean(found), `person ${id} disappeared`)
    if (found) {
      check(
        mismatches,
        found.status === PERSON_RETIRED_STATUS,
        `person ${id} status is ${found.status}, expected ${PERSON_RETIRED_STATUS}`,
      )
    }
  }

  // The whole point: audit history untouched.
  check(
    mismatches,
    observed.activityEventCount === 1,
    `activity_events count is ${observed.activityEventCount}, expected 1 — audit history ` +
      `must be identical`,
  )
  check(
    mismatches,
    observed.activityEventCompanyIds.every((id) => id === TENANT_A_COMPANY_ID),
    "activity_event company_id changed",
  )
  check(
    mismatches,
    observed.activityEventActorIds.every((id) => id === ADMIN_AUTH_USER_ID),
    "activity_event actor_id changed — the actor identity must survive",
  )

  check(mismatches, observed.adminAuthExists, "admin auth user must still exist as the audit actor")
  check(
    mismatches,
    observed.adminBannedUntil !== null,
    "admin auth user is not banned — a usable synthetic login remains",
  )
  check(
    mismatches,
    observed.absentAuthUserIdsStillPresent.length === 0,
    "an auth user that should be absent reappeared",
  )

  return mismatches.length === 0 ? { ok: true } : { ok: false, mismatches }
}

/**
 * Execution is opt-in and run-specific.
 *
 * The variable must carry the run id rather than a truthy word, so that a value
 * left over in a shell cannot authorize a different run, and so that authorizing
 * anything requires naming what is being authorized.
 */
export const EXECUTE_ENV_VAR = "E2E_QUARANTINE_EXECUTE"

export function isExecutionAuthorized(env: Record<string, string | undefined>): boolean {
  return env[EXECUTE_ENV_VAR]?.trim() === QUARANTINE_RUN_ID
}

/**
 * The operational journal is retired only after the postconditions pass, and
 * never before: while quarantine is incomplete, the journal is the only record of
 * what this run owns.
 */
export function shouldRetireJournal(postconditions: Verdict): boolean {
  return postconditions.ok
}

/** Strip anything sensitive before a journal is archived for forensics. */
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
