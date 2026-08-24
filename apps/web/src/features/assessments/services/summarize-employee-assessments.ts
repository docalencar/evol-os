import type { AssessmentResponse } from "../types/assessment-response"

export type EmployeeAssessmentSummary = Readonly<{
  completedAssessments: number
  pendingAssessments: number
  averageScore: number | null
  latestAssessmentAt: string | null
}>

export function summarizeEmployeeAssessments(
  responses: readonly AssessmentResponse[]
): EmployeeAssessmentSummary {
  const completed = responses.filter(
    (response) => response.status === "completed"
  )
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
    averageScore: null,
    latestAssessmentAt: completedDates[0] ?? null,
  })
}
