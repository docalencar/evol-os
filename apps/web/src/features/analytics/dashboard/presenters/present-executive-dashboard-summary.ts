import type { ExecutiveDashboardSummary } from "../types/executive-dashboard-summary"

export function presentExecutiveDashboardSummary(
  summary: ExecutiveDashboardSummary,
): ExecutiveDashboardSummary {
  return {
    employees: {
      ...summary.employees,
    },

    departments: {
      ...summary.departments,
    },

    positions: {
      ...summary.positions,
    },

    assessmentCycles: {
      ...summary.assessmentCycles,
    },

    assessments: {
      ...summary.assessments,
    },
  }
}
