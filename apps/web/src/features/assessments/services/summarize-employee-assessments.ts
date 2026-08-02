import type { AssessmentAnswer } from "../types/assessment-answer"
import type { AssessmentResponse } from "../types/assessment-response"

export type EmployeeAssessmentSummary = Readonly<{
  completedAssessments: number
  pendingAssessments: number
  averageScore: number | null
  latestAssessmentAt: string | null
}>

export function summarizeEmployeeAssessments(
  responses: readonly AssessmentResponse[],
  answers: readonly AssessmentAnswer[]
): EmployeeAssessmentSummary {
  const completed = responses.filter(
    (response) => response.status === "completed"
  )
  const scores = answers
    .map((answer) => answer.score)
    .filter((score): score is number => score !== null)
  const completedDates = completed
    .map((response) => response.completed_at)
    .filter((date): date is string => date !== null)
    .sort((left, right) => right.localeCompare(left))

  return Object.freeze({
    completedAssessments: completed.length,
    pendingAssessments: responses.filter(
      (response) =>
        response.status === "draft" ||
        response.status === "in_progress" ||
        response.status === "submitted"
    ).length,
    averageScore:
      scores.length === 0
        ? null
        : scores.reduce((total, score) => total + score, 0) / scores.length,
    latestAssessmentAt: completedDates[0] ?? null,
  })
}
