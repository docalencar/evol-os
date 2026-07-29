import {
  createEmptyProjectedOrganization,
  freezeProjectedOrganization,
  StructuralProjectionMetricsCalculator,
  type ProjectedOrganization,
} from "../../projection"
import type { PlanningOperationalOrganization } from "../ports"

export function createBaselineOrganization(
  source: PlanningOperationalOrganization
): ProjectedOrganization {
  const organization = freezeProjectedOrganization({
    departments: source.departments.map((department) => ({
      ...department,
      status: "active" as const,
    })),
    teams: source.teams.map((team) => ({
      ...team,
      status: "active" as const,
    })),
    positions: source.positions.map(({ active, ...position }) => ({
      ...position,
      status: active ? "active" as const : "archived" as const,
    })),
    employees: source.employees.map((employee) => ({
      ...employee,
      departmentId:
        source.positions.find(
          (position) => position.id === employee.positionId
        )?.departmentId ?? null,
      status: "active" as const,
    })),
    vacancies: [],
    metrics: createEmptyProjectedOrganization().metrics,
  })
  const metrics = new StructuralProjectionMetricsCalculator()
    .calculate(organization)

  return freezeProjectedOrganization({
    ...organization,
    metrics,
  })
}
