import type { AssessmentResponseStatus } from "../types/assessment-response"

export type AssessmentCycleProgressResponse = {
  status: AssessmentResponseStatus
}

export type AssessmentCycleProgressViewModel = {
  total: number
  notStarted: number
  inProgress: number
  submitted: number
  completed: number
  cancelled: number
  finished: number
  pending: number
  completionPercentage: number
}
