import type { AssessmentCycleProgressResponse } from "../view-models/assessment-cycle-progress-view-model"

import { presentAssessmentCycleProgress } from "./assessment-cycle-progress-presenter"
import { presentAssessmentCycleResults } from "./assessment-cycle-results-presenter"

export type AssessmentCycleDashboardViewModel = {
  participantsCount: number
  responsesCount: number
  progress: ReturnType<typeof presentAssessmentCycleProgress>
  results: ReturnType<typeof presentAssessmentCycleResults>
}

export function presentAssessmentCycleDashboard(
  participants: readonly unknown[],
  responses: AssessmentCycleProgressResponse[]
): AssessmentCycleDashboardViewModel {
  const progress =
    presentAssessmentCycleProgress(responses)

  return {
    participantsCount: participants.length,

    responsesCount: responses.length,

    progress,

    results: presentAssessmentCycleResults({
      participants: participants.length,
      progress,
    }),
  }
}
