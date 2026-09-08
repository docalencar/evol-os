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
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
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
import {
  ASSESSMENT_SNAPSHOT_PRESSURE_RPC,
  COMPANY_RETENTION_TABLES,
  COMPANY_SCOPED_TABLES,
  PRIVILEGED_COUNT_BOUNDARIES,
  PRIVILEGED_COUNT_TABLES,
  RETENTION_PRESSURE_RPC,
} from "./retention-registry"
import {
  AUTH_BAN_DURATION,
  COMPANY_RETIRED_STATUS,
  PERSON_RETIRED_STATUS,
  MEMBERSHIP_RETIRED_STATUS,
  PROTECTED_OWNER_ROLE,
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

test("the plan deactivates non-owner memberships but never the owner", () => {
  const plan = planRetirement(ownership())
  const membershipSteps = plan.steps.filter((s) => s.kind === "retire-nonowner-memberships")
  assert.equal(membershipSteps.length, 1, "exactly one membership step per owned company")
  // No step may carry the owner role as a target.
  assert.ok(!plan.steps.some((s) => (s as { role?: string }).role === "owner"))
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
        memberships: [
          { userId: OWNER_USER, role: "owner", status: "active" },
          { userId: MEMBER_USER, role: "manager", status: MEMBERSHIP_RETIRED_STATUS },
        ],
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

test("the tables needing a privileged boundary are the 0069 and 0114 families", () => {
  assert.deepEqual([...PRIVILEGED_COUNT_TABLES].sort(), [
    "assessment_execution_snapshot_questions",
    "assessment_execution_snapshot_sections",
    "assessment_execution_snapshots",
    "development_template_application_attempts",
    "development_template_application_lineage",
    "development_template_application_snapshots",
    "development_template_applications",
  ])
})

test("each privileged table names the boundary that actually answers for it", () => {
  // Two boundaries exist and they have disjoint closed lists. Sending a table to
  // the wrong one is not a type error — the RPC simply returns no row for it,
  // which becomes `rows: null` and makes the whole run unclassifiable. So the
  // pairing is asserted, not assumed.
  const byBoundary = new Map<string, string[]>()
  for (const entry of COMPANY_RETENTION_TABLES) {
    if (entry.access !== "PRIVILEGED_COUNT_BOUNDARY") continue
    assert.ok(entry.boundary, `${entry.table} routes through a boundary but does not name one`)
    byBoundary.set(entry.boundary as string, [
      ...(byBoundary.get(entry.boundary as string) ?? []),
      entry.table,
    ])
  }

  assert.deepEqual([...(byBoundary.get(RETENTION_PRESSURE_RPC) ?? [])].sort(), [
    "development_template_application_attempts",
    "development_template_application_lineage",
    "development_template_application_snapshots",
    "development_template_applications",
  ])
  assert.deepEqual([...(byBoundary.get(ASSESSMENT_SNAPSHOT_PRESSURE_RPC) ?? [])].sort(), [
    "assessment_execution_snapshot_questions",
    "assessment_execution_snapshot_sections",
    "assessment_execution_snapshots",
  ])

  assert.deepEqual([...PRIVILEGED_COUNT_BOUNDARIES].sort(), [
    ASSESSMENT_SNAPSHOT_PRESSURE_RPC,
    RETENTION_PRESSURE_RPC,
  ].sort())
})

test("a directly readable table never names a boundary", () => {
  for (const entry of COMPANY_RETENTION_TABLES) {
    if (entry.access !== "DIRECT_READ") continue
    assert.equal(
      entry.boundary,
      undefined,
      `${entry.table} is counted directly and must not claim a boundary`,
    )
  }
})

test("no table is both directly readable and routed through the boundary", () => {
  for (const entry of COMPANY_RETENTION_TABLES) {
    const viaBoundary = PRIVILEGED_COUNT_TABLES.includes(entry.table)
    assert.equal(
      viaBoundary,
      entry.access === "PRIVILEGED_COUNT_BOUNDARY",
      `${entry.table} has an inconsistent access mode`,
    )
  }
})

// ---------------------------------------------------------------------------
// E4-S1. The assessment footprint the next journey will create
//
// E2E-4 writes rows nine assessment tables never touched before. Five of them
// were in NEITHER registry list, so the inspector could not name them and the
// classifier could not weigh them. These tests pin what each one is for.
// ---------------------------------------------------------------------------

/** The five tables the E2E-4 discovery found missing from both lists. */
const E2E4_DISCOVERED_TABLES = [
  "assessment_answers",
  "assessment_execution_snapshot_questions",
  "assessment_execution_snapshot_sections",
  "assessment_execution_snapshots",
  "assessment_questions",
] as const

test("every table the E2E-4 discovery found is now known to the inspector", () => {
  for (const table of E2E4_DISCOVERED_TABLES) {
    assert.ok(
      COMPANY_SCOPED_TABLES.includes(table),
      `${table} will hold E2E-4 rows and must be nameable by the residual inspector`,
    )
  }
})

test("every assessment blocker carries the intra-tenant RESTRICT shape", () => {
  const intraTenant = COMPANY_RETENTION_TABLES.filter(
    (entry) => entry.mechanism === "intra-tenant-restrict-fk",
  )

  assert.deepEqual([...intraTenant.map((entry) => entry.table)].sort(), [
    "assessment_answers",
    "assessment_execution_snapshot_questions",
    "assessment_execution_snapshot_sections",
    "assessment_execution_snapshots",
    "assessment_responses",
  ])

  for (const entry of intraTenant) {
    // Every one of them must be countable SOMEHOW. A blocker the classifier
    // cannot count is worse than no blocker: it makes every run unclassifiable.
    if (entry.access === "PRIVILEGED_COUNT_BOUNDARY") {
      assert.equal(
        entry.boundary,
        ASSESSMENT_SNAPSHOT_PRESSURE_RPC,
        `${entry.table} must be counted by the 0127 boundary`,
      )
      assert.match(entry.evidence, /0114:885/, `${entry.table} must cite the revoke`)
    }
    assert.match(entry.evidence, /RESTRICT/, `${entry.table} must cite the RESTRICT edge`)
  }
})

test("a residual in ANY assessment table alone forces RETIRED", () => {
  // One row in one table, everything else empty — each of the five must be
  // enough on its own, and must be named as the thing that blocked.
  for (const table of [
    "assessment_responses",
    "assessment_answers",
    "assessment_execution_snapshots",
    "assessment_execution_snapshot_sections",
    "assessment_execution_snapshot_questions",
  ]) {
    const probes = emptyProbes()
    const index = probes.findIndex((p) => p.table === table)
    assert.notEqual(index, -1, `${table} must be in the retention registry`)
    probes[index] = { ...probes[index], rows: 1 }

    const verdict = classifyTerminalStrategy(probes, ownership())
    assert.ok("strategy" in verdict && verdict.strategy === "RETIRED", `${table} must block`)
    assert.deepEqual(verdict.blockedBy.map((p) => p.table), [table])
  }
})

test("zero rows everywhere still yields CLEANED — no table became a false blocker", () => {
  // The registry grew by three entries. Presence in the list must not by itself
  // retire a run that genuinely holds nothing.
  const verdict = classifyTerminalStrategy(emptyProbes(), ownership())
  assert.equal("strategy" in verdict && verdict.strategy, "CLEANED")
  assert.ok(
    emptyProbes().some((probe) => probe.table === "assessment_execution_snapshots"),
    "the snapshot tables really are among the probes being asserted as empty",
  )
})

test("assessment_questions is observable but is NOT claimed to block deletion", () => {
  // It is only ever the TARGET of a RESTRICT edge (from assessment_answers and
  // from the snapshot questions); its own foreign keys cascade or set null. The
  // rows that do the blocking are counted in those tables, so listing this one
  // as a blocker would inflate the registry with a claim the schema does not
  // make. Observability and blocking are different jobs.
  assert.ok(COMPANY_SCOPED_TABLES.includes("assessment_questions"))
  assert.equal(
    COMPANY_RETENTION_TABLES.some((entry) => entry.table === "assessment_questions"),
    false,
  )
})

test("no snapshot table is left depending on a direct read", () => {
  // This is the E4-S1 window, closed. Each of the three had SELECT revoked from
  // service_role by 0114:885, so a DIRECT_READ entry would probe `rows: null`.
  for (const table of [
    "assessment_execution_snapshots",
    "assessment_execution_snapshot_sections",
    "assessment_execution_snapshot_questions",
  ]) {
    const entry = COMPANY_RETENTION_TABLES.find((candidate) => candidate.table === table)
    assert.ok(entry, `${table} must be a retention entry now that 0127 can count it`)
    assert.equal(entry?.access, "PRIVILEGED_COUNT_BOUNDARY", `${table} must not be read directly`)
    assert.ok(COMPANY_SCOPED_TABLES.includes(table), `${table} must stay nameable by the inspector`)
  }
})

test("a boundary that fails still fails closed for the whole run", () => {
  // The reason the three tables could not simply be listed before 0127, kept as
  // a live demonstration rather than prose: an unreadable retention table makes
  // the WHOLE run `unavailable`, E2E-0 through E2E-3 included, and cleanup then
  // refuses to mutate anything. That is the correct behaviour and must survive —
  // it is what a broken or dropped boundary looks like.
  const probes = emptyProbes()
  const index = probes.findIndex((p) => p.table === "assessment_execution_snapshots")
  assert.notEqual(index, -1)
  probes[index] = {
    ...probes[index],
    rows: null,
    failure: { status: 403, message: "" },
  }

  const verdict = classifyTerminalStrategy(probes, ownership())
  assert.ok(!("strategy" in verdict), "must refuse to classify")
  assert.equal((verdict as { status: string }).status, "unavailable")
})

test("the 0127 boundary is pinned by name and never granted beyond service_role", () => {
  // Structural, against the migration itself: the harness names an RPC, and the
  // security of that name lives in SQL. If the migration is edited to widen the
  // grant or to hand the caller a relation name, this fails.
  // Executable SQL only. The migration's own prose necessarily says the words
  // "does not grant SELECT" in order to explain the boundary, and a negative
  // assertion over raw text would fail on that documentation — a trap this
  // repository has fallen into before.
  const migration = readFileSync(
    resolve(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "supabase",
      "migrations",
      "0127_create_assessment_snapshot_retention_pressure_boundary.sql",
    ),
    "utf8",
  )
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")

  assert.ok(
    migration.includes(`create or replace function public.${ASSESSMENT_SNAPSHOT_PRESSURE_RPC}(`),
    "the migration must define exactly the function the registry names",
  )
  assert.match(migration, /security definer/)
  assert.match(migration, /set search_path = ''/)
  assert.match(migration, /^stable$/m)
  assert.match(
    migration,
    new RegExp(`revoke all on function public\\.${ASSESSMENT_SNAPSHOT_PRESSURE_RPC}\\(uuid\\)\\s*\\nfrom public, anon, authenticated;`),
  )
  assert.match(
    migration,
    new RegExp(`grant execute on function public\\.${ASSESSMENT_SNAPSHOT_PRESSURE_RPC}\\(uuid\\)\\s*\\nto service_role;`),
  )

  // The whole point: counting must not become reading.
  assert.equal(/grant\s+select/i.test(migration), false, "must not grant SELECT on any table")
  assert.equal(/execute\s+format|execute\s+'/i.test(migration), false, "no dynamic SQL")

  // Every relation it counts is one of the three, spelled out in the body.
  for (const table of [
    "assessment_execution_snapshots",
    "assessment_execution_snapshot_sections",
    "assessment_execution_snapshot_questions",
  ]) {
    assert.ok(
      migration.includes(`from public.${table}\n  where company_id = p_company_id`),
      `${table} must be counted for one exact company`,
    )
  }
})

test("the pre-existing blocking mechanisms are untouched", () => {
  const byMechanism = (mechanism: string) =>
    COMPANY_RETENTION_TABLES.filter((entry) => entry.mechanism === mechanism)
      .map((entry) => entry.table)
      .sort()

  assert.deepEqual(byMechanism("immutable-trigger"), [
    "activity_events",
    "approval_decisions",
    "approval_domain_events",
    "development_template_application_attempts",
    "development_template_application_lineage",
    "development_template_application_snapshots",
    "notification_audit",
    "notification_deliveries",
    "notification_delivery_attempts",
    "notification_events",
    "notifications",
    "organization_planning_snapshots",
    "tenant_access_audit_events",
  ])

  assert.deepEqual(byMechanism("restrict-fk"), [
    "development_template_applications",
    "development_template_version_goals",
    "development_template_versions",
  ])
})

test("widening the registry cannot widen what teardown deletes", () => {
  // Neither list is a delete predicate. Physical cleanup issues exactly one
  // delete — the journalled company, by exact id — and lets the cascade do the
  // rest; the registries only decide CLEANED vs RETIRED and what gets counted.
  // Pinned structurally so a future "cleanup helper" cannot start reading them.
  const fixture = readFileSync(resolve(__dirname, "..", "fixtures/tenant-fixture.ts"), "utf8")
  const destroy = fixture.slice(fixture.indexOf("export async function destroyRunFixtures"))

  const deleted = [...destroy.matchAll(/from\("([a-z_]+)"\)\.delete\(\)/g)].map((m) => m[1])
  assert.deepEqual(deleted, ["companies"], "physical cleanup deletes companies and nothing else")
  assert.match(destroy, /\.eq\("id", companyId\)/, "the one delete is by exact company id")

  for (const list of ["COMPANY_RETENTION_TABLES", "COMPANY_SCOPED_TABLES"]) {
    assert.ok(!fixture.includes(list), `${list} must never reach the destructive path`)
  }
})

test("every retention table is counted for one exact company, never discovered", () => {
  const retire = readFileSync(resolve(__dirname, "retire.ts"), "utf8")

  // The direct probe is scoped by a full company id passed in, and every
  // privileged one hands that same id to its counts-only boundary.
  assert.match(retire, /\.eq\("company_id", companyId\)/)
  assert.match(retire, /\.rpc\(boundary, \{ p_company_id: companyId \}\)/)

  // The boundary name comes from the registry, never from anything the caller
  // or the database could influence.
  assert.match(retire, /for \(const boundary of PRIVILEGED_COUNT_BOUNDARIES\)/)
  assert.equal(
    /\.rpc\((`|")/.test(retire),
    false,
    "no RPC name is spelled inline — the registry is the single source",
  )

  // No pattern matching anywhere near a retention read.
  for (const forbidden of [/\.like\(/, /\.ilike\(/, /\.neq\("company_id"/, /\.not\("company_id"/]) {
    assert.equal(forbidden.test(retire), false, `retire.ts must not use ${forbidden}`)
  }
})


// ---------------------------------------------------------------------------
// Extended retirement: non-owner memberships are neutralised directly
// ---------------------------------------------------------------------------

test("the canonical inactive membership status comes from the 0001 CHECK constraint", () => {
  assert.equal(MEMBERSHIP_RETIRED_STATUS, "inactive")
  assert.equal(PROTECTED_OWNER_ROLE, "owner")
})

test("the plan deactivates non-owner memberships per owned company", () => {
  const plan = planRetirement(ownership())
  const steps = plan.steps.filter((s) => s.kind === "retire-nonowner-memberships")
  assert.deepEqual(steps, [{ kind: "retire-nonowner-memberships", companyId: COMPANY }])
})

test("people are retired BEFORE memberships, and the company last", () => {
  // 0072 counts people ROWS for an active membership and never reads status, so
  // this order keeps every intermediate state domain-valid.
  const kinds = planRetirement(ownership()).steps.map((s) => s.kind)
  const people = kinds.indexOf("retire-people")
  const members = kinds.indexOf("retire-nonowner-memberships")
  const company = kinds.indexOf("retire-company")
  assert.ok(people < members, "people must precede membership deactivation")
  assert.ok(members < company, "company must be last of the three")
})

test("the plan still never deactivates the owner, and says why", () => {
  const plan = planRetirement(ownership())
  // NB: the step kind is "retire-nonowner-memberships", which contains the
  // substring "owner" — assert on the target role, not on raw text.
  assert.ok(!plan.steps.some((s) => (s as { role?: string }).role === "owner"))
  assert.ok(plan.steps.every((s) => s.kind !== ("retire-owner-membership" as never)))
  assert.match(plan.notAttempted.join(" "), /LAST_ACTIVE_OWNER_REQUIRED/)
  assert.match(plan.notAttempted.join(" "), /Non-owner memberships ARE deactivated/)
})

test("postconditions FAIL when a non-owner membership is left active", () => {
  const state = retiredState({
    companies: [
      {
        ...retiredState().companies[0],
        memberships: [
          { userId: OWNER_USER, role: "owner", status: "active" },
          { userId: MEMBER_USER, role: "manager", status: "active" },
        ],
      },
    ],
  })
  const verdict = evaluateRetirementPostconditions(state, before)
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /manager membership .* is active, expected inactive/)
})

test("postconditions FAIL if the owner membership disappeared entirely", () => {
  const state = retiredState({
    companies: [
      {
        ...retiredState().companies[0],
        memberships: [
          { userId: MEMBER_USER, role: "manager", status: MEMBERSHIP_RETIRED_STATUS },
        ],
      },
    ],
  })
  const verdict = evaluateRetirementPostconditions(state, before)
  assert.equal(verdict.ok, false)
  assert.match(reasons(verdict), /owner membership disappeared/)
})

test("a company whose only membership is the owner still passes", () => {
  // Company B in the residual run: sole owner, nothing to deactivate.
  const state = retiredState({
    companies: [
      {
        ...retiredState().companies[0],
        memberships: [{ userId: OWNER_USER, role: "owner", status: "active" }],
      },
    ],
  })
  assert.deepEqual(evaluateRetirementPostconditions(state, before), { ok: true })
})

test.after(() => {
  rmSync(TEST_RUN_DIR, { recursive: true, force: true })
})
