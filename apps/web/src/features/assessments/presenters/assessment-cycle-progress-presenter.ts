import type {
  AssessmentCycleProgressResponse,
  AssessmentCycleProgressViewModel,
} from "../view-models/assessment-cycle-progress-view-model"

export function presentAssessmentCycleProgress(
  responses: AssessmentCycleProgressResponse[]
): AssessmentCycleProgressViewModel {
  const total = responses.length

  const notStarted = responses.filter(
    (response) => response.status === "draft"
  ).length

  const inProgress = responses.filter(
    (response) => response.status === "in_progress"
  ).length

  const submitted = responses.filter(
    (response) => response.status === "submitted"
  ).length

  const completed = responses.filter(
    (response) => response.status === "completed"
  ).length

  const cancelled = responses.filter(
    (response) => response.status === "cancelled"
  ).length

  const finished = submitted + completed

  const pending =
    notStarted + inProgress

  const completionPercentage =
    total === 0
      ? 0
      : Math.round((finished / total) * 100)

  return {
    total,
    notStarted,
    inProgress,
    submitted,
    completed,
    cancelled,
    finished,
    pending,
    completionPercentage,
  }
}
