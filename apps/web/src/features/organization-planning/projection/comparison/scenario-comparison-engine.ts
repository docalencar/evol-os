import type { ProjectedOrganization, ProjectionSnapshot } from "../contracts"
import { compareMetrics, createComparisonSummary } from "./comparison-summary"
import type { ComparisonSource, ScenarioComparisonInput, ScenarioComparisonResult } from "./comparison-contracts"
import { ScenarioComparisonError } from "./comparison-error"
import { compareDepartments } from "./department-comparator"
import { compareEmployees } from "./employee-comparator"
import { comparePositions } from "./position-comparator"
import { compareTeams } from "./team-comparator"
import { compareVacancies } from "./vacancy-comparator"

export class ScenarioComparisonEngine {
  static create() { return new ScenarioComparisonEngine() }

  compare(input: ScenarioComparisonInput): ScenarioComparisonResult {
    validateScope(input.before, input.after)
    const before = organizationOf(input.before, "before")
    const after = organizationOf(input.after, "after")
    const departments = compareDepartments(before.departments, after.departments)
    const teams = compareTeams(before.teams, after.teams)
    const positions = comparePositions(before.positions, after.positions)
    const employees = compareEmployees(before.employees, after.employees)
    const vacancies = compareVacancies(before.vacancies, after.vacancies)
    const metrics = compareMetrics(before.metrics, after.metrics)
    const compared = Object.freeze({ departments, teams, positions, employees, vacancies, metrics })
    return Object.freeze({ ...compared, summary: createComparisonSummary(compared) })
  }
}

function organizationOf(source: ComparisonSource, side: "before" | "after"): ProjectedOrganization {
  if (isSnapshot(source)) {
    if (!source.organization) throw new ScenarioComparisonError("organization_missing", `O snapshot ${side} não possui organização hidratada.`)
    return source.organization
  }
  return source
}

function validateScope(before: ComparisonSource, after: ComparisonSource) {
  if (!isSnapshot(before) || !isSnapshot(after)) return
  if (before.companyId !== after.companyId) throw new ScenarioComparisonError("company_mismatch", "Os snapshots devem pertencer à mesma Company.")
  if (before.workspaceId !== after.workspaceId) throw new ScenarioComparisonError("workspace_mismatch", "Os snapshots devem pertencer ao mesmo Workspace.")
}

function isSnapshot(source: ComparisonSource): source is ProjectionSnapshot {
  return "companyId" in source && "workspaceId" in source
}
