import type {
  CompetencyCoverage,
  CompetencyCoverageState,
  CompetencyExpectation,
  EmployeeCompetencyLevel,
} from "../types/competency-coverage"
import { calculateCompetencyGap } from "./calculate-competency-gap"

type DeriveCompetencyCoverageInput = Readonly<{
  positionId: string | null
  expectations: readonly CompetencyExpectation[]
  employeeLevels: readonly EmployeeCompetencyLevel[]
}>

function getCoverageState(
  positionId: string | null,
  expectedCount: number,
  assessedCount: number
): CompetencyCoverageState {
  if (!positionId) {
    return "no_position"
  }

  if (expectedCount === 0) {
    return "not_configured"
  }

  if (assessedCount === 0) {
    return "not_assessed"
  }

  if (assessedCount < expectedCount) {
    return "partially_assessed"
  }

  return "assessed"
}

export function deriveCompetencyCoverage({
  positionId,
  expectations,
  employeeLevels,
}: DeriveCompetencyCoverageInput): CompetencyCoverage {
  const currentLevelByCompetency = new Map(
    employeeLevels.map((level) => [level.competencyId, level.currentLevel])
  )
  const assessedExpectations = expectations.filter((expectation) =>
    currentLevelByCompetency.has(expectation.competencyId)
  )
  const unassessedExpectations = expectations.filter(
    (expectation) => !currentLevelByCompetency.has(expectation.competencyId)
  )
  const expectedCount = expectations.length
  const assessedCount = assessedExpectations.length

  return Object.freeze({
    state: getCoverageState(positionId, expectedCount, assessedCount),
    expectedCount,
    assessedCount,
    unassessedCount: expectedCount - assessedCount,
    coverage:
      expectedCount === 0
        ? null
        : assessedCount / expectedCount,
    gaps: Object.freeze(
      assessedExpectations.map((expectation) =>
        calculateCompetencyGap({
          ...expectation,
          currentLevel: currentLevelByCompetency.get(
            expectation.competencyId
          ) as number,
        })
      )
    ),
    unassessedCompetencies: Object.freeze(
      unassessedExpectations.map((expectation) => ({
        competencyId: expectation.competencyId,
        competencyName: expectation.competencyName,
        expectedLevel: expectation.expectedLevel,
      }))
    ),
  })
}
