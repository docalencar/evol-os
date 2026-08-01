import type { AssessmentViewModel } from "../view-models/assessment-view-model"

export type AssessmentExecutiveDashboard = Readonly<{
  assessments: readonly AssessmentViewModel[]

  summary: Readonly<{
    total: number
    draft: number
    scheduled: number
    active: number
    completed: number
    cancelled: number
  }>

  activeAssessments: readonly AssessmentViewModel[]

  scheduledAssessments: readonly AssessmentViewModel[]

  cancelledAssessments: readonly AssessmentViewModel[]
}>
