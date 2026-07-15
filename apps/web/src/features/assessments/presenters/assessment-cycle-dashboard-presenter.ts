import type { AssessmentCycleProgressResponse } from "../view-models/assessment-cycle-progress-view-model"
import { presentAssessmentCycleProgress } from "./assessment-cycle-progress-presenter"

export type AssessmentCycleDashboardViewModel = {
  participantsCount: number
  responsesCount: number
  progress: ReturnType<typeof presentAssessmentCycleProgress>
}

export function presentAssessmentCycleDashboard(
  participants: readonly unknown[],
  responses: AssessmentCycleProgressResponse[]
): AssessmentCycleDashboardViewModel {
  return {
    participantsCount: participants.length,
    responsesCount: responses.length,
    progress: presentAssessmentCycleProgress(responses),
  }
}
