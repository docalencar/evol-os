import type { ScenarioComparisonResult } from "../comparison-contracts"
import {
  mapDepartmentComparison,
  mapEmployeeComparison,
  mapPositionComparison,
  mapTeamComparison,
} from "../mappers"
import type {
  ComparisonSummaryViewModel,
  ScenarioComparisonViewModel,
} from "../view-models"

export class ScenarioComparisonPresenter {
  private constructor() {}

  static present(
    comparison: ScenarioComparisonResult
  ): ScenarioComparisonViewModel {
    return {
      departments: mapDepartmentComparison(comparison.departments),
      teams: mapTeamComparison(comparison.teams),
      positions: mapPositionComparison(comparison.positions),
      employees: mapEmployeeComparison(comparison.employees),
      summary: mapSummary(comparison),
    }
  }
}

function mapSummary(
  comparison: ScenarioComparisonResult
): ComparisonSummaryViewModel {
  const { summary } = comparison

  return {
    departments: { ...summary.departments },
    teams: { ...summary.teams },
    positions: { ...summary.positions },
    employees: { ...summary.employees },
    metrics: {
      headcount: { ...summary.metrics.headcount },
      vacancies: { ...summary.metrics.vacancies },
      departments: { ...summary.metrics.departments },
      positions: { ...summary.metrics.positions },
    },
    totalChanges: summary.totalChanges,
  }
}
