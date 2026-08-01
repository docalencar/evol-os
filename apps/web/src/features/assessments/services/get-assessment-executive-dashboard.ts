import { getAssessmentCycles } from "../queries/get-assessment-cycles"
import { presentAssessments } from "../presenters/assessment-presenter"
import { presentAssessmentSummary } from "../presenters/assessment-summary-presenter"

import type { AssessmentExecutiveDashboard } from "../types/assessment-executive-dashboard"

export async function getAssessmentExecutiveDashboard(
  companyId: string,
): Promise<AssessmentExecutiveDashboard> {
  const cycles = await getAssessmentCycles(companyId)

  const assessments = presentAssessments(cycles)

  const summary =
    presentAssessmentSummary(assessments)

  return Object.freeze({
    assessments,

    summary,

    activeAssessments: assessments.filter(
      (assessment) =>
        assessment.status === "active",
    ),

    scheduledAssessments: assessments.filter(
      (assessment) =>
        assessment.status === "scheduled",
    ),

    cancelledAssessments: assessments.filter(
      (assessment) =>
        assessment.status === "cancelled",
    ),
  })
}
