import type { ProjectedOrganization, ProjectionMetrics } from "../contracts"

export interface ProjectionMetricsCalculator {
  calculate(organization: ProjectedOrganization): ProjectionMetrics
}

export class StructuralProjectionMetricsCalculator implements ProjectionMetricsCalculator {
  calculate(organization: ProjectedOrganization): ProjectionMetrics {
    return Object.freeze({
      headcount: organization.employees.length,
      vacancies: organization.vacancies.length,
      salaryMass: 0,
      departments: organization.departments.length,
      positions: organization.positions.length,
    })
  }
}
