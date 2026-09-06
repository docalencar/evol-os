/**
 * The quarantine runner is the most dangerous command in this repository: it
 * mutates production-shaped data on Review with a privileged client. So every
 * one of its refusals is pinned here, and the healthy path is pinned only once.
 *
 * These tests are pure — the contract module has no I/O — but the run directory
 * is redirected anyway, on principle: nothing in this suite may be able to
 * resolve the real operational journal.
 */

import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

const TEST_RUN_DIR = mkdtempSync(resolve(tmpdir(), "evol-e2e-quarantine-"))
process.env.E2E_RUN_DIR = TEST_RUN_DIR

import {
  ADMIN_AUTH_USER_ID,
  EMPLOYEE_PERSON_ID,
  EXECUTE_ENV_VAR,
  MANAGER_PERSON_ID,
  OWNER_PERSON_ID,
  QUARANTINE_PROJECT_REF,
  QUARANTINE_RUN_ID,
  TENANT_A_COMPANY_ID,
  baselineFingerprint,
  evaluatePostconditions,
  evaluatePreconditions,
  isExecutionAuthorized,
  redactJournalForArchive,
  shouldRetireJournal,
  type ObservedState,
} from "./quarantine-contract"

/** Exactly the world observed on Review after the failed hosted run. */
function healthyBefore(overrides: Partial<ObservedState> = {}): ObservedState {
  return Object.freeze({
    projectRef: QUARANTINE_PROJECT_REF,
    runId: QUARANTINE_RUN_ID,
    companyAExists: true,
    companyAStatus: "active",
    companyBExists: false,
    memberships: [{ userId: ADMIN_AUTH_USER_ID, role: "owner", status: "active" }],
    people: [
      { id: OWNER_PERSON_ID, linkedUserId: ADMIN_AUTH_USER_ID, status: "active" },
      { id: MANAGER_PERSON_ID, linkedUserId: null, status: "active" },
      { id: EMPLOYEE_PERSON_ID, linkedUserId: null, status: "active" },
    ],
    activityEventCount: 1,
    activityEventCompanyIds: [TENANT_A_COMPANY_ID],
    activityEventActorIds: [ADMIN_AUTH_USER_ID],
    adminAuthExists: true,
    adminBannedUntil: null,
    absentAuthUserIdsStillPresent: [],
    ...overrides,
  })
}

/** The world the runner must produce. */
function healthyAfter(overrides: Partial<ObservedState> = {}): ObservedState {
  return Object.freeze({
    ...healthyBefore(),
    companyAStatus: "inactive",
    people: [
      { id: OWNER_PERSON_ID, linkedUserId: ADMIN_AUTH_USER_ID, status: "terminated" },
      { id: MANAGER_PERSON_ID, linkedUserId: null, status: "terminated" },
      { id: EMPLOYEE_PERSON_ID, linkedUserId: null, status: "terminated" },
    ],
    adminBannedUntil: "2126-01-01T00:00:00Z",
    ...overrides,
  })
}

function reasons(verdict: ReturnType<typeof evaluatePreconditions>): string {
  return verdict.ok ? "" : verdict.mismatches.join(" | ")
}

// ---------------------------------------------------------------------------
// Preconditions — the runner must recognise the exact diagnosed world...
// ---------------------------------------------------------------------------

test("the diagnosed world passes preconditions", () => {
  assert.deepEqual(evaluatePreconditions(healthyBefore()), { ok: true })
})

test("refuses a different run id", () => {
  const verdict = evaluatePreconditions(healthyBefore({ runId: "260905215100-28aa3b" }))
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /run id is 260905215100-28aa3b/)
})

test("refuses a different project ref", () => {
  const verdict = evaluatePreconditions(
    healthyBefore({ projectRef: "gzrrwyiqfbnyprkdeqvm" }),
  )
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /project ref is gzrrwyiqfbnyprkdeqvm/)
})

test("refuses when company A is already gone", () => {
  const verdict = evaluatePreconditions(
    healthyBefore({ companyAExists: false, companyAStatus: null }),
  )
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /company A is missing/)
})

test("refuses when company A is not active — quarantine may already have run", () => {
  const verdict = evaluatePreconditions(healthyBefore({ companyAStatus: "inactive" }))
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /company A status is inactive/)
})

test("refuses when company B unexpectedly exists", () => {
  const verdict = evaluatePreconditions(healthyBefore({ companyBExists: true }))
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /company B unexpectedly exists/)
})

test("refuses a second, unexplained activity_event", () => {
  const verdict = evaluatePreconditions(
    healthyBefore({
      activityEventCount: 2,
      activityEventCompanyIds: [TENANT_A_COMPANY_ID, TENANT_A_COMPANY_ID],
      activityEventActorIds: [ADMIN_AUTH_USER_ID, ADMIN_AUTH_USER_ID],
    }),
  )
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /expected exactly 1 activity_event, found 2/)
})

test("refuses an activity_event whose actor is someone else", () => {
  const verdict = evaluatePreconditions(
    healthyBefore({ activityEventActorIds: ["99999999-9999-4999-8999-999999999999"] }),
  )
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /names an actor other than the admin/)
})

test("refuses a membership that is not the expected sole owner", () => {
  const extra = evaluatePreconditions(
    healthyBefore({
      memberships: [
        { userId: ADMIN_AUTH_USER_ID, role: "owner", status: "active" },
        { userId: "77777777-7777-4777-8777-777777777777", role: "admin", status: "active" },
      ],
    }),
  )
  assert.equal(extra.ok, false)
  assert.match(reasons(extra), /2 membership\(s\), expected exactly 1/)

  const wrongRole = evaluatePreconditions(
    healthyBefore({
      memberships: [{ userId: ADMIN_AUTH_USER_ID, role: "admin", status: "active" }],
    }),
  )
  assert.equal(wrongRole.ok, false)
  assert.match(reasons(wrongRole), /membership role is admin/)
})

test("refuses when a person's link or status is not as diagnosed", () => {
  const relinked = evaluatePreconditions(
    healthyBefore({
      people: [
        { id: OWNER_PERSON_ID, linkedUserId: ADMIN_AUTH_USER_ID, status: "active" },
        { id: MANAGER_PERSON_ID, linkedUserId: ADMIN_AUTH_USER_ID, status: "active" },
        { id: EMPLOYEE_PERSON_ID, linkedUserId: null, status: "active" },
      ],
    }),
  )
  assert.equal(relinked.ok, false)
  assert.match(reasons(relinked), /manager person links to .*expected NULL/)

  const missing = evaluatePreconditions(
    healthyBefore({
      people: [
        { id: OWNER_PERSON_ID, linkedUserId: ADMIN_AUTH_USER_ID, status: "active" },
        { id: MANAGER_PERSON_ID, linkedUserId: null, status: "active" },
      ],
    }),
  )
  assert.equal(missing.ok, false)
  assert.match(reasons(missing), /expected exactly 3/)
})

test("refuses when an auth user that should be gone has reappeared", () => {
  const verdict = evaluatePreconditions(
    healthyBefore({
      absentAuthUserIdsStillPresent: ["08ad64ba-4320-4c62-a0ae-73f70522ca9c"],
    }),
  )
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /still exist/)
})

test("refuses when the admin is already banned", () => {
  const verdict = evaluatePreconditions(
    healthyBefore({ adminBannedUntil: "2126-01-01T00:00:00Z" }),
  )
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /already banned/)
})

// ---------------------------------------------------------------------------
// Authorization and TOCTOU
// ---------------------------------------------------------------------------

test("execution is impossible without explicit, run-specific authorization", () => {
  assert.equal(isExecutionAuthorized({}), false)
  assert.equal(isExecutionAuthorized({ [EXECUTE_ENV_VAR]: "" }), false)
  assert.equal(isExecutionAuthorized({ [EXECUTE_ENV_VAR]: "true" }), false)
  assert.equal(isExecutionAuthorized({ [EXECUTE_ENV_VAR]: "1" }), false)
  assert.equal(isExecutionAuthorized({ [EXECUTE_ENV_VAR]: "yes" }), false)
  // A leftover value naming a DIFFERENT run must not authorize this one.
  assert.equal(isExecutionAuthorized({ [EXECUTE_ENV_VAR]: "260905215100-28aa3b" }), false)
  assert.equal(isExecutionAuthorized({ [EXECUTE_ENV_VAR]: QUARANTINE_RUN_ID }), true)
  assert.equal(isExecutionAuthorized({ [EXECUTE_ENV_VAR]: ` ${QUARANTINE_RUN_ID} ` }), true)
})

test("the fingerprint is stable across row ordering but changes on real drift", () => {
  const a = healthyBefore()
  const reordered = healthyBefore({
    people: [...a.people].reverse(),
  })
  assert.equal(baselineFingerprint(a), baselineFingerprint(reordered))

  for (const drift of [
    healthyBefore({ companyAStatus: "inactive" }),
    healthyBefore({ activityEventCount: 2 }),
    healthyBefore({ adminBannedUntil: "2126-01-01T00:00:00Z" }),
    healthyBefore({ companyBExists: true }),
    healthyBefore({
      people: [
        { id: OWNER_PERSON_ID, linkedUserId: ADMIN_AUTH_USER_ID, status: "terminated" },
        { id: MANAGER_PERSON_ID, linkedUserId: null, status: "active" },
        { id: EMPLOYEE_PERSON_ID, linkedUserId: null, status: "active" },
      ],
    }),
  ]) {
    assert.notEqual(
      baselineFingerprint(drift),
      baselineFingerprint(a),
      "drift must invalidate the approved baseline",
    )
  }
})

// ---------------------------------------------------------------------------
// Postconditions
// ---------------------------------------------------------------------------

test("the intended end state passes postconditions", () => {
  assert.deepEqual(evaluatePostconditions(healthyAfter()), { ok: true })
})

test("postconditions fail if the admin was not banned", () => {
  const verdict = evaluatePostconditions(healthyAfter({ adminBannedUntil: null }))
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /usable synthetic login remains/)
})

test("postconditions fail if any person is still active", () => {
  const verdict = evaluatePostconditions(
    healthyAfter({
      people: [
        { id: OWNER_PERSON_ID, linkedUserId: ADMIN_AUTH_USER_ID, status: "terminated" },
        { id: MANAGER_PERSON_ID, linkedUserId: null, status: "active" },
        { id: EMPLOYEE_PERSON_ID, linkedUserId: null, status: "terminated" },
      ],
    }),
  )
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /status is active, expected terminated/)
})

test("postconditions fail if the company was deleted rather than retired", () => {
  const verdict = evaluatePostconditions(
    healthyAfter({ companyAExists: false, companyAStatus: null }),
  )
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /must still exist — this is retirement/)
})

test("postconditions fail if audit history changed in any way", () => {
  for (const [drift, pattern] of [
    [healthyAfter({ activityEventCount: 0 }), /audit history/],
    [healthyAfter({ activityEventCount: 2 }), /audit history/],
    [healthyAfter({ activityEventActorIds: [null] }), /actor_id changed/],
    [
      healthyAfter({ activityEventCompanyIds: ["55555555-5555-4555-8555-555555555555"] }),
      /company_id changed/,
    ],
  ] as const) {
    const verdict = evaluatePostconditions(drift)
    assert.equal(verdict.ok, false)
    assert.match(reasons(verdict), pattern)
  }
})

test("the owner membership must remain active, and a change is flagged", () => {
  // Not an aspiration that failed — an invariant. LAST_ACTIVE_OWNER_REQUIRED
  // forbids deactivating a tenant's only owner, so a run that somehow produced
  // `inactive` means the invariant moved and must be re-examined.
  const verdict = evaluatePostconditions(
    healthyAfter({
      memberships: [{ userId: ADMIN_AUTH_USER_ID, role: "owner", status: "inactive" }],
    }),
  )
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /LAST_ACTIVE_OWNER_REQUIRED/)
})

// ---------------------------------------------------------------------------
// Journal lifecycle
// ---------------------------------------------------------------------------

test("the operational journal is retired only after postconditions pass", () => {
  assert.equal(shouldRetireJournal({ ok: true }), true)
  assert.equal(shouldRetireJournal({ ok: false, mismatches: ["anything"] }), false)
})

test("the forensic archive carries no passwords", () => {
  const archived = redactJournalForArchive({
    runId: QUARANTINE_RUN_ID,
    users: [
      { role: "admin", userId: ADMIN_AUTH_USER_ID, password: "s3cret-value" },
      { role: "manager", userId: MANAGER_PERSON_ID, password: "another-s3cret" },
    ],
  }) as { users: Array<Record<string, unknown>> }

  const serialized = JSON.stringify(archived)
  assert.ok(!serialized.includes("s3cret-value"), "a password reached the archive")
  assert.ok(!serialized.includes("another-s3cret"), "a password reached the archive")
  for (const user of archived.users) assert.equal(user.password, "<redacted>")
  // Non-secret forensic detail survives.
  assert.equal(archived.users[0].userId, ADMIN_AUTH_USER_ID)
})

test.after(() => {
  rmSync(TEST_RUN_DIR, { recursive: true, force: true })
})
