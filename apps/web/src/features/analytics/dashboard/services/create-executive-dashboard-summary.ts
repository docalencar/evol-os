import type { ExecutiveDashboardSummary } from "../types/executive-dashboard-summary"

export function createExecutiveDashboardSummary(): ExecutiveDashboardSummary {
  return {
    employees: {
      total: 0,
      active: 0,
      inactive: 0,
    },

    departments: {
      total: 0,
    },

    positions: {
      total: 0,
    },

    assessmentCycles: {
      total: 0,
      active: 0,
      completed: 0,
    },

    assessments: {
      responses: 0,
      averageScore: null,
    },
  }
}
