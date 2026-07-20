export type AssessmentCycleResultMetric = {
  label: string
  value: number | string
  description?: string
}

export type AssessmentCycleResultsViewModel = {
  completionPercentage: number

  metrics: AssessmentCycleResultMetric[]

  hasResponses: boolean
}
