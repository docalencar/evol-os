import assert from "node:assert/strict"
import test from "node:test"

import { deriveCanonicalCompanyPersonCompetencyCoverages } from "./services/derive-canonical-company-person-competency-coverages"
import type { PersonCompetencyExpectationRow } from "./types/person-competency-gap"

const personA = "11111111-1111-4111-8111-111111111111"
const personB = "22222222-2222-4222-8222-222222222222"
const positionId = "33333333-3333-4333-8333-333333333333"
const profileId = "44444444-4444-4444-8444-444444444444"

function sentinel(
  personId: string,
  state: PersonCompetencyExpectationRow["assignment_state"],
): PersonCompetencyExpectationRow {
  return {
    assignment_state: state,
    person_id: personId,
    position_id: state === "no_position" ? null : positionId,
    position_seniority_profile_id:
      state === "no_position" || state === "missing_profile" ? null : profileId,
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

function fact(
  personId: string,
  competencyId: string,
  currentLevel: number | null,
): PersonCompetencyExpectationRow {
  return {
    ...sentinel(personId, "active_assignment_with_expectations"),
    position_id: positionId,
    position_seniority_profile_id: profileId,
    competency_id: competencyId,
    competency_name: `Competência ${competencyId.slice(0, 1)}`,
    expected_level: 4,
    weight: 5,
    required: true,
    competency_type: "core",
    expectation_source: "base",
    inherited: false,
    current_level: currentLevel,
  }
}

test("groups rows by person, preserves sentinels and orders people deterministically", () => {
  const competencyA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  const competencyB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
  const result = deriveCanonicalCompanyPersonCompetencyCoverages([
    fact(personB, competencyB, null),
    sentinel(personA, "missing_profile"),
    fact(personB, competencyA, 2),
  ])

  assert.deepEqual(result.map((coverage) => coverage.personId), [personA, personB])
  assert.equal(result[0].assignmentState, "missing_profile")
  assert.deepEqual(result[0].competencies, [])
  assert.deepEqual(
    result[1].competencies.map((competency) => competency.gap),
    [2, null],
  )
})

for (const state of [
  "no_position",
  "missing_profile",
  "stale_assignment",
  "active_assignment_with_no_expectations",
] as const) {
  test(`does not synthesize expectations or Base fallback for ${state}`, () => {
    const [coverage] = deriveCanonicalCompanyPersonCompetencyCoverages([
      sentinel(personA, state),
    ])

    assert.equal(coverage.assignmentState, state)
    assert.deepEqual(coverage.competencies, [])
  })
}
