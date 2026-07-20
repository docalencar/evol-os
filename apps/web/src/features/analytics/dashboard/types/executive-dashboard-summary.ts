export type ExecutiveDashboardSummary = {
  employees: {
    total: number
    active: number
    inactive: number
  }

  departments: {
    total: number
  }

  positions: {
    total: number
  }

  assessmentCycles: {
    total: number
    active: number
    completed: number
  }

  assessments: {
    responses: number
    averageScore: number | null
  }
}
