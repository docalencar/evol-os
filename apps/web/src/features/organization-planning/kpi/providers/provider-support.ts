import type { PlanningKPIResult, PlanningKPISource } from "../contracts"

export const PLANNING_KPI_KEYS = Object.freeze({
  headcount: "planning.headcount",
  approvedHeadcount: "planning.approved-headcount",
  plannedHeadcount: "planning.planned-headcount",
  vacancies: "planning.vacancies",
  occupiedPositions: "planning.occupied-positions",
  occupancyRate: "planning.occupancy-rate",
  currentPayroll: "planning.current-payroll",
  plannedPayroll: "planning.planned-payroll",
  payrollVariation: "planning.payroll-variation",
  departments: "planning.departments",
  teams: "planning.teams",
  positions: "planning.positions",
  spanOfControl: "planning.span-of-control",
  organizationalLayers: "planning.organizational-layers",
  scenarioImpact: "planning.scenario-impact",
  createdPositions: "planning.created-positions",
  archivedPositions: "planning.archived-positions",
  createdTeams: "planning.created-teams",
  archivedTeams: "planning.archived-teams",
  createdDepartments: "planning.created-departments",
  archivedDepartments: "planning.archived-departments",
} as const)

export function result(key: string, value: number): PlanningKPIResult {
  return Object.freeze({ key, value })
}

export function activeCount(items: readonly Readonly<{ status?: string }>[] | undefined): number {
  return (items ?? []).filter((item) => item.status !== "archived").length
}

export function valueFor(
  results: readonly PlanningKPIResult[], key: string
): number {
  return results.find((item) => item.key === key)?.value ?? 0
}

export function projected(source: PlanningKPISource) {
  return source.planned
}
