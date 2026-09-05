import assert from "node:assert/strict"
import test from "node:test"

import {
  deriveCanonicalPersonCompetencyCoverage,
  InvalidPersonCompetencyExpectationRowsError,
} from "./services/derive-canonical-person-competency-coverage"
import type { PersonCompetencyExpectationRow } from "./types/person-competency-gap"

function expectation(
  overrides: Partial<PersonCompetencyExpectationRow> = {}
): PersonCompetencyExpectationRow {
  return {
    assignment_state: "active_assignment_with_expectations",
    person_id: "person-1",
    position_id: "position-1",
    position_seniority_profile_id: "profile-1",
    seniority_level_id: "seniority-1",
    competency_id: "competency-1",
    competency_name: "Comunicação",
    expected_level: 4,
    weight: 3,
    required: true,
    competency_type: "technical",
    expectation_notes: "Contexto factual",
    expectation_source: "override",
    inherited: false,
    employee_competency_id: "employee-competency-1",
    current_level: 2,
    evidence_source: "manager_validation",
    validated_at: "2026-09-01T12:00:00.000Z",
    ...overrides,
  }
}

function sentinel(
  assignmentState:
    | "no_position"
    | "missing_profile"
    | "stale_assignment"
    | "active_assignment_with_no_expectations"
): PersonCompetencyExpectationRow {
  return {
    assignment_state: assignmentState,
    person_id: "person-1",
    position_id: assignmentState === "no_position" ? null : "position-1",
    position_seniority_profile_id:
      assignmentState === "no_position" || assignmentState === "missing_profile"
        ? null
        : "profile-1",
    seniority_level_id: null,
    competency_id: null,
    competency_name: null,
    expected_level: null,
    weight: null,
    required: null,
    competency_type: null,
    expectation_notes: null,
    expectation_source: null,
    inherited: null,
    employee_competency_id: null,
    current_level: null,
    evidence_source: null,
    validated_at: null,
  }
}

test("preserves every sentinel assignment state without fabricating gaps", () => {
  const states = [
    "no_position",
    "missing_profile",
    "stale_assignment",
    "active_assignment_with_no_expectations",
  ] as const

  for (const state of states) {
    const result = deriveCanonicalPersonCompetencyCoverage([sentinel(state)])

    assert.equal(result.assignmentState, state)
    assert.deepEqual(result.competencies, [])
  }
})

test("uses expected minus current for deficiency, match, and exceeded expectation", () => {
  const result = deriveCanonicalPersonCompetencyCoverage([
    expectation({ competency_id: "deficiency", expected_level: 4, current_level: 2 }),
    expectation({ competency_id: "matched", expected_level: 3, current_level: 3 }),
    expectation({ competency_id: "exceeded", expected_level: 2, current_level: 4 }),
  ])

  assert.deepEqual(
    result.competencies.map(({ competencyId, gap, evidenceState }) => ({
      competencyId,
      gap,
      evidenceState,
    })),
    [
      { competencyId: "deficiency", gap: 2, evidenceState: "assessed" },
      { competencyId: "matched", gap: 0, evidenceState: "assessed" },
      { competencyId: "exceeded", gap: -2, evidenceState: "assessed" },
    ]
  )
})

test("keeps missing current evidence unassessed with a null gap", () => {
  const result = deriveCanonicalPersonCompetencyCoverage([
    expectation({ expected_level: 5, current_level: null }),
  ])
  const competency = result.competencies[0]

  assert.equal(competency?.currentLevel, null)
  assert.equal(competency?.gap, null)
  assert.notEqual(competency?.gap, 0)
  assert.equal(competency?.evidenceState, "unassessed")
})

test("preserves factual metadata without using it to alter the gap", () => {
  const result = deriveCanonicalPersonCompetencyCoverage([
    expectation({
      expected_level: 5,
      current_level: 1,
      weight: 1,
      required: false,
      competency_type: "behavioral",
      inherited: true,
      expectation_source: "base",
    }),
  ])

  assert.deepEqual(result.competencies[0], {
    competencyId: "competency-1",
    competencyName: "Comunicação",
    expectedLevel: 5,
    currentLevel: 1,
    gap: 4,
    evidenceState: "assessed",
    weight: 1,
    required: false,
    competencyType: "behavioral",
    inherited: true,
    expectationSource: "base",
    expectationNotes: "Contexto factual",
    employeeCompetencyId: "employee-competency-1",
    evidenceSource: "manager_validation",
    validatedAt: "2026-09-01T12:00:00.000Z",
  })
})

test("weight, required, competency type, and inheritance never change the gap", () => {
  const result = deriveCanonicalPersonCompetencyCoverage([
    expectation({
      competency_id: "baseline",
      expected_level: 4,
      current_level: 2,
      weight: 1,
      required: false,
      competency_type: "technical",
      inherited: false,
    }),
    expectation({
      competency_id: "different-context",
      expected_level: 4,
      current_level: 2,
      weight: 5,
      required: true,
      competency_type: "leadership",
      inherited: true,
    }),
  ])

  assert.deepEqual(
    result.competencies.map((competency) => competency.gap),
    [2, 2]
  )
})

test("covers levels 1 and 5 without clamping negative gaps", () => {
  const result = deriveCanonicalPersonCompetencyCoverage([
    expectation({ competency_id: "one-one", expected_level: 1, current_level: 1 }),
    expectation({ competency_id: "five-five", expected_level: 5, current_level: 5 }),
    expectation({ competency_id: "one-five", expected_level: 1, current_level: 5 }),
    expectation({ competency_id: "five-one", expected_level: 5, current_level: 1 }),
  ])

  assert.deepEqual(
    result.competencies.map((competency) => competency.gap),
    [0, 0, -4, 4]
  )
})

test("preserves canonical incoming order deterministically", () => {
  const rows = [
    expectation({ competency_id: "third", competency_name: "Terceira" }),
    expectation({ competency_id: "first", competency_name: "Primeira" }),
    expectation({ competency_id: "second", competency_name: "Segunda" }),
  ]

  const first = deriveCanonicalPersonCompetencyCoverage(rows)
  const second = deriveCanonicalPersonCompetencyCoverage(rows)

  assert.deepEqual(
    first.competencies.map((competency) => competency.competencyId),
    ["third", "first", "second"]
  )
  assert.deepEqual(second, first)
})

test("rejects malformed rows instead of manufacturing semantic results", () => {
  const malformedInputs: readonly (readonly PersonCompetencyExpectationRow[])[] = [
    [],
    [expectation({ assignment_state: "unknown" })],
    [expectation({ competency_id: null })],
    [expectation({ expected_level: null })],
    [expectation({ expected_level: 0 })],
    [expectation({ expected_level: 6 })],
    [expectation({ current_level: 0 })],
    [expectation({ current_level: 6 })],
    [expectation(), expectation({ assignment_state: "stale_assignment" })],
    [sentinel("no_position"), sentinel("no_position")],
    [sentinel("missing_profile"), expectation()],
    [{ ...sentinel("no_position"), position_id: "impossible-position" }],
    [expectation({ position_seniority_profile_id: null })],
    [expectation(), expectation({ person_id: "person-2" })],
  ]

  for (const rows of malformedInputs) {
    assert.throws(
      () => deriveCanonicalPersonCompetencyCoverage(rows),
      InvalidPersonCompetencyExpectationRowsError
    )
  }

  assert.throws(
    () =>
      deriveCanonicalPersonCompetencyCoverage([
        { ...sentinel("stale_assignment"), expected_level: 3 },
      ]),
    /sentinel row contains competency fact/
  )
})
