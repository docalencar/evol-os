import assert from "node:assert/strict"
import test from "node:test"

import type { CanonicalPersonCompetencyCoverage } from "@/features/competencies/person-competency-gaps/types/person-competency-gap"

import { presentDashboardCompetencyDevelopment } from "./dashboard-competency-development-presenter"

const personA = "11111111-1111-4111-8111-111111111111"
const personB = "22222222-2222-4222-8222-222222222222"

function coverage(
  personId: string,
  competencies: CanonicalPersonCompetencyCoverage["competencies"],
): CanonicalPersonCompetencyCoverage {
  return {
    assignmentState: "active_assignment_with_expectations",
    personId,
    positionId: "33333333-3333-4333-8333-333333333333",
    positionSeniorityProfileId: "44444444-4444-4444-8444-444444444444",
    seniorityLevelId: null,
    competencies,
  }
}

function competency(
  id: string,
  name: string,
  gap: number | null,
  metadata: Readonly<{ weight?: number; required?: boolean; competencyType?: string }> = {},
) {
  return {
    competencyId: id,
    competencyName: name,
    expectedLevel: 4,
    currentLevel: gap === null ? null : 4 - gap,
    gap,
    evidenceState: gap === null ? "unassessed" as const : "assessed" as const,
    weight: metadata.weight ?? 1,
    required: metadata.required ?? false,
    competencyType: metadata.competencyType ?? "core",
    inherited: false,
    expectationSource: "base",
    expectationNotes: null,
    employeeCompetencyId: null,
    evidenceSource: null,
    validatedAt: null,
  }
}

test("classifies canonical positive, zero, negative and null gaps factually", () => {
  const result = presentDashboardCompetencyDevelopment(
    [{ personId: personA, personName: "Ana" }],
    [coverage(personA, [
      competency("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "Deficiência", 2),
      competency("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "Atende", 0),
      competency("cccccccc-cccc-4ccc-8ccc-cccccccccccc", "Supera", -1),
      competency("dddddddd-dddd-4ddd-8ddd-dddddddddddd", "Não avaliada", null),
    ])],
  )

  assert.deepEqual(
    {
      assessed: result.assessed,
      unassessed: result.unassessed,
      deficiencies: result.deficiencies,
      meets: result.meets,
      exceeds: result.exceeds,
    },
    { assessed: 3, unassessed: 1, deficiencies: 1, meets: 1, exceeds: 1 },
  )
  assert.deepEqual(result.priorities.map((item) => item.competencyName), ["Deficiência"])
  assert.equal(result.priorities[0].personName, "Ana")
})

test("orders only assessed deficiencies by gap, name and stable IDs", () => {
  const result = presentDashboardCompetencyDevelopment(
    [
      { personId: personA, personName: "Ana" },
      { personId: personB, personName: "Bruno" },
    ],
    [
      coverage(personB, [
        competency("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", "Beta", 2, {
          weight: 100,
          required: true,
          competencyType: "promotion",
        }),
      ]),
      coverage(personA, [
        competency("ffffffff-ffff-4fff-8fff-ffffffffffff", "Alpha", 3),
        competency("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "Beta", 2, {
          weight: 0,
          required: false,
          competencyType: "optional",
        }),
        competency("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "Sem evidência", null),
      ]),
    ],
  )

  assert.deepEqual(
    result.priorities.map((item) => `${item.gap}:${item.competencyName}:${item.personId}`),
    [`3:Alpha:${personA}`, `2:Beta:${personA}`, `2:Beta:${personB}`],
  )
})

test("preserves assignment-state summaries without fabricating competency counts", () => {
  const result = presentDashboardCompetencyDevelopment(
    [{ personId: personA, personName: "Ana" }],
    [{
      ...coverage(personA, []),
      assignmentState: "stale_assignment",
    }],
  )

  assert.equal(result.people[0].assignmentState, "stale_assignment")
  assert.deepEqual(result.priorities, [])
  assert.equal(result.assessed, 0)
  assert.equal(result.unassessed, 0)
})
