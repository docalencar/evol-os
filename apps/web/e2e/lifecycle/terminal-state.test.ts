/**
 * The lifecycle decision decides what gets mutated on Review, so every refusal
 * is pinned here and the healthy paths are pinned once each.
 *
 * Pure by construction — the contract module has no I/O — but the run directory
 * is still redirected to a temp dir before any path-sensitive import, on
 * principle: no test in this repository may be able to resolve the operational
 * `.run` journal. An earlier revision of the suite deleted a live one.
 */

import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

const TEST_RUN_DIR = mkdtempSync(resolve(tmpdir(), "evol-e2e-lifecycle-"))
process.env.E2E_RUN_DIR = TEST_RUN_DIR

// Static imports: no `"type": "module"` here, so tsx emits CommonJS and a
// top-level `await import()` is a hard transform error. CJS `require` calls keep
// statement order, so the assignment above still wins, and `runDir()` reads the
// variable lazily anyway.
import { runDir } from "../helpers/run-paths"
import { COMPANY_RETENTION_TABLES, COMPANY_SCOPED_TABLES } from "./retention-registry"
import {
  AUTH_BAN_DURATION,
  COMPANY_RETIRED_STATUS,
  PERSON_RETIRED_STATUS,
  baselineFingerprint,
  classifyTerminalStrategy,
  describeProbeFailure,
  evaluateRetirementPostconditions,
  planRetirement,
  redactJournalForArchive,
  shouldFinalizeJournal,
  terminalStateForFailedRetirement,
  type ObservedState,
  type OwnershipFacts,
  type RetentionProbe,
} from "./terminal-state"

const COMPANY = "11111111-1111-4111-8111-111111111111"
const OTHER_COMPANY = "22222222-2222-4222-8222-222222222222"
const OWNER_USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const MEMBER_USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const PERSON_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const PERSON_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

function ownership(overrides: Partial<OwnershipFacts> = {}): OwnershipFacts {
  return {
    runId: "260906120000-abc123",
    supabaseRef: "rwfvxvbzaosgcyfxdjpt",
    companyIds: [COMPANY],
    authUserIds: [OWNER_USER, MEMBER_USER],
    ...overrides,
  }
}

function probe(table: string, rows: number | null, failure?: Record<string, unknown>): RetentionProbe {
  return { table, mechanism: "immutable-trigger", rows, failure: failure as never }
}

/** Every registry table empty — the shape of a run that wrote no audit rows. */
function emptyProbes(): RetentionProbe[] {
  return COMPANY_RETENTION_TABLES.map((entry) => ({
    table: entry.table,
    mechanism: entry.mechanism,
    rows: 0,
  }))
}

function reasons(v: { ok: boolean } | { status: string; reason: string }): string {
  if ("reason" in v) return v.reason
  return "mismatches" in v ? (v as { mismatches: string[] }).mismatches.join(" | ") : ""
}

// ---------------------------------------------------------------------------
// 12. isolation
// ---------------------------------------------------------------------------

test("test run state is provably outside the operational run directory", () => {
  const operational = resolve(process.cwd(), "apps", "web", "e2e", ".run")
  assert.equal(runDir(), TEST_RUN_DIR)
  assert.ok(!runDir().startsWith(operational), `must not resolve into ${operational}`)
})

// ---------------------------------------------------------------------------
// 1 & 2. the two healthy classifications
// ---------------------------------------------------------------------------

test("no audit evidence -> CLEANED", () => {
  const verdict = classifyTerminalStrategy(emptyProbes(), ownership())
  assert.equal("strategy" in verdict && verdict.strategy, "CLEANED")
})

test("immutable audit evidence -> RETIRED, naming what blocked it", () => {
  const probes = emptyProbes()
  probes[0] = probe("activity_events", 4)
  const verdict = classifyTerminalStrategy(probes, ownership())

  assert.ok("strategy" in verdict && verdict.strategy === "RETIRED")
  assert.deepEqual(verdict.blockedBy.map((p) => p.table), ["activity_events"])
})

test("a blocker OTHER than activity_events also forces RETIRED", () => {
  // The registry exists precisely so the classifier is not blind to these.
  for (const table of [
    "notification_events",
    "approval_decisions",
    "tenant_access_audit_events",
    "development_template_applications",
  ]) {
    const probes = emptyProbes()
    const index = probes.findIndex((p) => p.table === table)
    assert.notEqual(index, -1, `${table} must be in the retention registry`)
    probes[index] = { ...probes[index], rows: 1 }

    const verdict = classifyTerminalStrategy(probes, ownership())
    assert.equal("strategy" in verdict && verdict.strategy, "RETIRED", `${table} must block`)
  }
})

// ---------------------------------------------------------------------------
// 3, 4, 5, 13. fail-closed
// ---------------------------------------------------------------------------

test("an unreadable retention table fails closed, never CLEANED", () => {
  const probes = emptyProbes()
  probes[2] = probe(probes[2].table, null, { status: 403, message: "permission denied" })
  const verdict = classifyTerminalStrategy(probes, ownership())

  assert.equal("status" in verdict && verdict.status, "unavailable")
  assert.match(reasons(verdict as never), /not evidence that it is empty/)
})

test("an empty probe set fails closed rather than assuming nothing is retained", () => {
  const verdict = classifyTerminalStrategy([], ownership())
  assert.equal("status" in verdict && verdict.status, "unavailable")
})

test("a nonsensical count fails closed", () => {
  for (const bad of [-1, 1.5, Number.NaN]) {
    const probes = emptyProbes()
    probes[0] = probe("activity_events", bad)
    const verdict = classifyTerminalStrategy(probes, ownership())
    assert.equal("status" in verdict && verdict.status, "unusable", `count ${bad}`)
  }
})

test("a truncated or malformed owned UUID is rejected before anything is planned", () => {
  for (const bad of ["1111", "", "not-a-uuid", "11111111-1111-4111-8111"]) {
    const verdict = classifyTerminalStrategy(emptyProbes(), ownership({ companyIds: [bad] }))
    assert.equal("status" in verdict && verdict.status, "unusable", `id ${bad}`)
    assert.match(reasons(verdict as never), /complete UUID/)
  }
  const badUser = classifyTerminalStrategy(emptyProbes(), ownership({ authUserIds: ["abcd"] }))
  assert.equal("status" in badUser && badUser.status, "unusable")
})

// ---------------------------------------------------------------------------
// 6, 8, 9. the plan
// ---------------------------------------------------------------------------

test("the plan targets people BY COMPANY and auth identities ONLY by journalled id", () => {
  const plan = planRetirement(ownership())

  const peopleSteps = plan.steps.filter((s) => s.kind === "retire-people")
  assert.deepEqual(peopleSteps, [{ kind: "retire-people", companyId: COMPANY }])

  const banned = plan.steps.filter((s) => s.kind === "ban-auth-user").map((s) => s.userId)
  assert.deepEqual(banned.sort(), [OWNER_USER, MEMBER_USER].sort())

  // A user the journal does not own can never appear in the plan.
  const foreign = "99999999-9999-4999-8999-999999999999"
  assert.ok(!banned.includes(foreign))
})

test("the plan never touches a foreign company", () => {
  const plan = planRetirement(ownership({ companyIds: [COMPANY] }))
  const touched = plan.steps
    .filter((s) => s.kind !== "ban-auth-user")
    .map((s) => (s as { companyId: string }).companyId)
  assert.ok(!touched.includes(OTHER_COMPANY))
  assert.deepEqual([...new Set(touched)], [COMPANY])
})

test("the plan never attempts to deactivate a membership, and says why", () => {
  const plan = planRetirement(ownership())
  assert.ok(!plan.steps.some((s) => JSON.stringify(s).includes("membership")))
  assert.match(plan.notAttempted.join(" "), /LAST_ACTIVE_OWNER_REQUIRED/)
})

test("the plan never writes to a retention table", () => {
  const plan = planRetirement(ownership())
  const serialized = JSON.stringify(plan.steps)
  for (const entry of COMPANY_RETENTION_TABLES) {
    assert.ok(!serialized.includes(entry.table), `plan must not touch ${entry.table}`)
  }
})

// ---------------------------------------------------------------------------
// 7, 8, 10, 11. postconditions
// ---------------------------------------------------------------------------

function retiredState(overrides: Partial<ObservedState> = {}): ObservedState {
  return {
    companies: [
      {
        companyId: COMPANY,
        exists: true,
        status: COMPANY_RETIRED_STATUS,
        people: [
          { id: PERSON_A, status: PERSON_RETIRED_STATUS },
          { id: PERSON_B, status: PERSON_RETIRED_STATUS },
        ],
        memberships: [{ userId: OWNER_USER, role: "owner", status: "active" }],
        probes: [probe("activity_events", 4)],
      },
    ],
    authUsers: [
      { userId: OWNER_USER, exists: true, bannedUntil: "2126-01-01T00:00:00Z" },
      { userId: MEMBER_USER, exists: false, bannedUntil: null },
    ],
    ...overrides,
  }
}

const before = new Map<string, readonly RetentionProbe[]>([
  [COMPANY, [probe("activity_events", 4)]],
])

test("the intended retired state passes", () => {
  assert.deepEqual(evaluateRetirementPostconditions(retiredState(), before), { ok: true })
})

test("retirement must preserve immutable audit rows EXACTLY", () => {
  for (const after of [3, 5, 0]) {
    const state = retiredState({
      companies: [{ ...retiredState().companies[0], probes: [probe("activity_events", after)] }],
    })
    const verdict = evaluateRetirementPostconditions(state, before)
    assert.equal(verdict.ok, false, `count ${after} must fail`)
    assert.match(reasons(verdict), /immutable audit rows must be identical/)
  }
})

test("a company deleted instead of retired fails — retirement is not deletion", () => {
  const state = retiredState({
    companies: [{ ...retiredState().companies[0], exists: false, status: null }],
  })
  const verdict = evaluateRetirementPostconditions(state, before)
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /no longer exists — retirement is not deletion/)
})

test("any person left active fails", () => {
  const state = retiredState({
    companies: [
      {
        ...retiredState().companies[0],
        people: [
          { id: PERSON_A, status: PERSON_RETIRED_STATUS },
          { id: PERSON_B, status: "active" },
        ],
      },
    ],
  })
  const verdict = evaluateRetirementPostconditions(state, before)
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /expected terminated/)
})

test("the sole-owner invariant must be preserved, and a change is flagged", () => {
  const state = retiredState({
    companies: [
      {
        ...retiredState().companies[0],
        memberships: [{ userId: OWNER_USER, role: "owner", status: "inactive" }],
      },
    ],
  })
  const verdict = evaluateRetirementPostconditions(state, before)
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /LAST_ACTIVE_OWNER_REQUIRED/)
})

test("an existing run-owned identity that is not banned fails", () => {
  const state = retiredState({
    authUsers: [{ userId: OWNER_USER, exists: true, bannedUntil: null }],
  })
  const verdict = evaluateRetirementPostconditions(state, before)
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /operational login remains/)
})

test("an identity already absent is acceptable", () => {
  const state = retiredState({
    authUsers: [{ userId: OWNER_USER, exists: false, bannedUntil: null }],
  })
  assert.deepEqual(evaluateRetirementPostconditions(state, before), { ok: true })
})

test("a missing pre-retirement snapshot fails closed", () => {
  const verdict = evaluateRetirementPostconditions(retiredState(), new Map())
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /no pre-retirement retention snapshot/)
})

test("a partial mutation is never finalized, and is never called RETIRED", () => {
  assert.equal(shouldFinalizeJournal({ ok: true }), true)
  assert.equal(shouldFinalizeJournal({ ok: false, mismatches: ["anything"] }), false)
  assert.equal(terminalStateForFailedRetirement(), "QUARANTINED")
})

// ---------------------------------------------------------------------------
// TOCTOU
// ---------------------------------------------------------------------------

test("the fingerprint ignores ordering but catches real drift", () => {
  const a = retiredState()
  const reordered = retiredState({
    companies: [{ ...a.companies[0], people: [...a.companies[0].people].reverse() }],
  })
  assert.equal(baselineFingerprint(a), baselineFingerprint(reordered))

  for (const drift of [
    retiredState({ companies: [{ ...a.companies[0], status: "active" }] }),
    retiredState({ companies: [{ ...a.companies[0], probes: [probe("activity_events", 5)] }] }),
    retiredState({ authUsers: [{ userId: OWNER_USER, exists: true, bannedUntil: null }] }),
  ]) {
    assert.notEqual(baselineFingerprint(drift), baselineFingerprint(a))
  }
})

// ---------------------------------------------------------------------------
// 14, 15. the classifier is read-only and free of failure-driven control flow
// ---------------------------------------------------------------------------

test("the classifier and contract perform no I/O and no delete-failure inspection", () => {
  const source = require("node:fs").readFileSync(
    resolve(__dirname, "terminal-state.ts"),
    "utf8",
  ) as string

  for (const forbidden of [".delete(", ".update(", ".insert(", ".upsert(", "adminClient", "fetch("]) {
    assert.ok(!source.includes(forbidden), `terminal-state.ts must not contain ${forbidden}`)
  }
  // The old detector matched on the immutability error text. Nothing may classify
  // by reading a failure message again.
  assert.ok(
    !/immutable and cannot be/i.test(source),
    "classification must not key off a DELETE failure message",
  )
})

test("evidence archives carry no passwords", () => {
  const archived = redactJournalForArchive({
    runId: "260906120000-abc123",
    users: [{ userId: OWNER_USER, password: "s3cret-value" }],
  }) as { users: Array<Record<string, unknown>> }

  assert.ok(!JSON.stringify(archived).includes("s3cret-value"))
  assert.equal(archived.users[0].password, "<redacted>")
  assert.equal(archived.users[0].userId, OWNER_USER)
})

test("the ban duration is an explicit long-lived value, not a password rotation", () => {
  assert.match(AUTH_BAN_DURATION, /^\d+h$/)
})


// ---------------------------------------------------------------------------
// Structured probe failures — the diagnostic that run 260906201436-5ecd5f lost
// ---------------------------------------------------------------------------

test("a 403 with an EMPTY message still renders something actionable, never ()", () => {
  // Exactly what Review returned for development_template_applications: PostgREST
  // answered 403 with an empty body, so message was "" and the old
  // `?? "no reason given"` let it through, printing "could not be read ()".
  const rendered = describeProbeFailure({ status: 403, statusText: "Forbidden", message: "" })

  assert.match(rendered, /HTTP 403 Forbidden/)
  assert.match(rendered, /message=<empty>/)
  assert.ok(!/^\s*$/.test(rendered))
})

test("the classifier's reason embeds the structured failure, not ()", () => {
  const probes = emptyProbes()
  probes[0] = probe("activity_events", null, { status: 403, statusText: "Forbidden", message: "" })
  const verdict = classifyTerminalStrategy(probes, ownership())

  assert.equal("status" in verdict && verdict.status, "unavailable")
  const reason = (verdict as { reason: string }).reason
  assert.match(reason, /HTTP 403 Forbidden/)
  assert.ok(!reason.includes("()"), "the empty-parenthesis rendering must be gone")
})

test("PostgREST code, details and hint all survive to the message", () => {
  const rendered = describeProbeFailure({
    status: 400,
    code: "42501",
    message: "permission denied for table x",
    details: "some details",
    hint: "some hint",
  })
  assert.match(rendered, /code=42501/)
  assert.match(rendered, /details=some details/)
  assert.match(rendered, /hint=some hint/)
})

test("a thrown network exception is described by class and message", () => {
  const rendered = describeProbeFailure({ thrownName: "TypeError", message: "fetch failed" })
  assert.match(rendered, /threw TypeError/)
  assert.match(rendered, /message=fetch failed/)
})

test("a failure with no detail at all still says so", () => {
  assert.match(describeProbeFailure({}), /no detail/)
  assert.match(describeProbeFailure(undefined), /no failure detail/)
})

test("an unreadable table can NEVER yield CLEANED, whatever the failure shape", () => {
  for (const failure of [
    { status: 403, message: "" },
    { thrownName: "TypeError", message: "fetch failed" },
    {},
  ]) {
    const probes = emptyProbes()
    probes[probes.length - 1] = probe(probes[probes.length - 1].table, null, failure)
    const verdict = classifyTerminalStrategy(probes, ownership())
    assert.ok(!("strategy" in verdict), "must not classify a strategy")
    assert.equal((verdict as { status: string }).status, "unavailable")
  }
})

// ---------------------------------------------------------------------------
// One canonical registry — no second list anywhere
// ---------------------------------------------------------------------------

test("every retention table is also a known company-scoped table", () => {
  for (const entry of COMPANY_RETENTION_TABLES) {
    assert.ok(
      COMPANY_SCOPED_TABLES.includes(entry.table),
      `${entry.table} is a retention blocker but missing from COMPANY_SCOPED_TABLES — ` +
        `the inspector would not see it, which is exactly the drift that hid ` +
        `development_template_applications`,
    )
  }
})

test("the inspector and the classifier read the same source of truth", () => {
  const inspectRun = require("node:fs").readFileSync(
    resolve(__dirname, "..", "inspect-run.ts"),
    "utf8",
  ) as string

  assert.match(
    inspectRun,
    /import \{ COMPANY_SCOPED_TABLES \} from "\.\/lifecycle\/retention-registry"/,
    "inspect-run must import the canonical list",
  )
  assert.ok(
    !/COMPANY_SCOPED_TABLES\s*(:|=)\s*\[/.test(inspectRun),
    "inspect-run must not declare a second list of its own",
  )
})

test.after(() => {
  rmSync(TEST_RUN_DIR, { recursive: true, force: true })
})
