import {
  type ScenarioComparisonInput,
  type ScenarioComparisonResult,
} from "./comparison-contracts"
import { createComparisonSummary } from "./comparison-summary"
import { compareDepartments } from "./department-comparator"
import { compareEmployees } from "./employee-comparator"
import { comparePositions } from "./position-comparator"
import { compareTeams } from "./team-comparator"

export class ScenarioComparisonEngine {
  private constructor() {}

  static create(): ScenarioComparisonEngine {
    return new ScenarioComparisonEngine()
  }

  compare(
    input: ScenarioComparisonInput
  ): ScenarioComparisonResult {
    const departments = compareDepartments(
      input.baseOrganization.departments,
      input.projectedOrganization.departments
    )
    const teams = compareTeams(
      input.baseOrganization.teams,
      input.projectedOrganization.teams
    )
    const positions = comparePositions(
      input.baseOrganization.positions,
      input.projectedOrganization.positions
    )
    const employees = compareEmployees(
      input.baseOrganization.employees,
      input.projectedOrganization.employees
    )

    return Object.freeze({
      departments,
      teams,
      positions,
      employees,
      summary: createComparisonSummary({
        departments,
        teams,
        positions,
        employees,
        baseMetrics: input.baseOrganization.metrics,
        projectedMetrics: input.projectedOrganization.metrics,
      }),
    })
  }
}
