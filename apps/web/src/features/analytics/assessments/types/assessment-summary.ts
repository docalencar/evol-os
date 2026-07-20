export type AssessmentSummary = {
  cycles: {
    total: number
    active: number
    completed: number
  }

  responses: {
    total: number
    completed: number
  }

  averageScore: number | null
}
