import type { AssessmentViewModel } from "../view-models/assessment-view-model"
import type { AssessmentSummaryViewModel } from "../view-models/assessment-view-model"

export function presentAssessmentSummary(
  assessments: AssessmentViewModel[]
): AssessmentSummaryViewModel {
  return assessments.reduce<AssessmentSummaryViewModel>(
    (summary, assessment) => {
      summary.total += 1
      summary[assessment.status] += 1

      return summary
    },
    {
      total: 0,
      draft: 0,
      scheduled: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    }
  )
}
