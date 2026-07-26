import type {
  OrganizationSnapshot,
} from "../../snapshot"

import type {
  ProjectedOrganization,
} from "../../projection/contracts"

import type {
  ScenarioStructuralImpact,
  StructuralImpactMetric,
} from "./types"


function calculateMetric(
  current: number,
  projected: number
): StructuralImpactMetric {
  return Object.freeze({
    current,
    projected,
    variation: projected - current,
  })
}


export function calculateStructuralImpact(
  snapshot: OrganizationSnapshot,
  projectedOrganization: ProjectedOrganization
): ScenarioStructuralImpact {
  return Object.freeze({
    departments: calculateMetric(
      snapshot.departments.length,
      projectedOrganization.departments.length
    ),

    teams: calculateMetric(
      snapshot.teams.length,
      projectedOrganization.teams.length
    ),

    positions: calculateMetric(
      snapshot.positions.length,
      projectedOrganization.positions.length
    ),

    employees: calculateMetric(
      snapshot.employees.length,
      projectedOrganization.employees.length
    ),
  })
}
