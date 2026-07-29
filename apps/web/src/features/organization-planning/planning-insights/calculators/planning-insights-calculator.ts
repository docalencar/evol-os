import type { ScenarioComparisonResult } from "../../projection/comparison"
import type { PlanningInsightsKpis, PlanningOrganizationalImpact } from "../contracts/planning-insights-contracts"

export function calculatePlanningInsightsKpis(comparison: ScenarioComparisonResult): PlanningInsightsKpis {
  return Object.freeze({
    headcountDelta: comparison.metrics.headcount.delta,
    vacanciesDelta: comparison.metrics.vacancies.delta,
    departmentsCreated: comparison.summary.departments.created,
    departmentsArchived: comparison.summary.departments.archived,
    teamsCreated: comparison.summary.teams.created,
    positionsCreated: comparison.summary.positions.created,
    employeesTransferred: comparison.summary.employees.transferred,
    employeesTerminated: comparison.summary.employees.terminated,
    vacanciesClosed: comparison.summary.vacancies.closed,
  })
}

export function calculateOrganizationalImpact(comparison: ScenarioComparisonResult): PlanningOrganizationalImpact {
  return Object.freeze({
    structuralChanges:
      comparison.summary.departments.total +
      comparison.summary.teams.total +
      comparison.summary.positions.total,
    workforceChanges: comparison.summary.employees.total,
    vacancyChanges: comparison.summary.vacancies.total,
    departmentsRemoved:
      comparison.summary.departments.archived + comparison.summary.departments.removed,
  })
}
