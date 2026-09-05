import { calculateCompetencyGap } from "@/features/talent/services/calculate-competency-gap"
import type { CompetencyCoverage } from "@/features/talent/types/competency-coverage"

import type {
  CanonicalPersonCompetencyCoverage,
  CanonicalPersonCompetencyGap,
} from "@/features/competencies/person-competency-gaps"

export type PersonCompetencyGapState =
  | "deficiency"
  | "meets_expectation"
  | "exceeds_expectation"
  | "unassessed"

export type PersonCompetencyGapViewModel = CanonicalPersonCompetencyGap &
  Readonly<{
    state: PersonCompetencyGapState
  }>

export type PersonCompetencyCoverageViewModel = Readonly<{
  assignmentState: CanonicalPersonCompetencyCoverage["assignmentState"]
  competencies: readonly PersonCompetencyGapViewModel[]
}>

export type PersonCompetencyPresentation = Readonly<{
  canonical: PersonCompetencyCoverageViewModel
  legacyTalentCoverage: CompetencyCoverage
}>

function getState(gap: CanonicalPersonCompetencyGap): PersonCompetencyGapState {
  if (gap.gap === null) return "unassessed"
  if (gap.gap > 0) return "deficiency"
  if (gap.gap === 0) return "meets_expectation"
  return "exceeds_expectation"
}

function getLegacyCoverageState(
  coverage: CanonicalPersonCompetencyCoverage,
  assessedCount: number
): CompetencyCoverage["state"] {
  if (coverage.assignmentState === "no_position") return "no_position"
  if (coverage.assignmentState !== "active_assignment_with_expectations") {
    return "not_configured"
  }
  if (assessedCount === 0) return "not_assessed"
  if (assessedCount < coverage.competencies.length) return "partially_assessed"
  return "assessed"
}

// Transitional People-only adapter. Shared Talent consumers still use the legacy
// current-minus-expected sign, so they receive values recalculated by the existing
// legacy function from canonical 0123 facts. The People gap UI never consumes it.
export function presentPersonCompetencyCoverage(
  coverage: CanonicalPersonCompetencyCoverage
): PersonCompetencyPresentation {
  const assessed = coverage.competencies.filter(
    (competency) => competency.currentLevel !== null
  )
  const legacyGaps = assessed.map((competency) =>
    calculateCompetencyGap({
      competencyId: competency.competencyId,
      competencyName: competency.competencyName,
      expectedLevel: competency.expectedLevel,
      currentLevel: competency.currentLevel as number,
      weight: competency.weight,
      required: competency.required,
    })
  )

  return Object.freeze({
    canonical: Object.freeze({
      assignmentState: coverage.assignmentState,
      competencies: Object.freeze(
        coverage.competencies.map((competency) =>
          Object.freeze({ ...competency, state: getState(competency) })
        )
      ),
    }),
    legacyTalentCoverage: Object.freeze({
      state: getLegacyCoverageState(coverage, assessed.length),
      expectedCount: coverage.competencies.length,
      assessedCount: assessed.length,
      unassessedCount: coverage.competencies.length - assessed.length,
      coverage:
        coverage.competencies.length === 0
          ? null
          : assessed.length / coverage.competencies.length,
      gaps: Object.freeze(legacyGaps),
      unassessedCompetencies: Object.freeze(
        coverage.competencies
          .filter((competency) => competency.currentLevel === null)
          .map((competency) => ({
            competencyId: competency.competencyId,
            competencyName: competency.competencyName,
            expectedLevel: competency.expectedLevel,
          }))
      ),
    }),
  })
}
