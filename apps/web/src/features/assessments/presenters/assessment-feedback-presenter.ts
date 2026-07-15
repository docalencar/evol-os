import type { AssessmentFeedbackQueryResult } from "../queries/get-assessment-feedback"
import type { AssessmentFeedbackViewModel } from "../view-models/assessment-feedback-view-model"

export function presentAssessmentFeedback(
  feedback: AssessmentFeedbackQueryResult
): AssessmentFeedbackViewModel {

  const competencies =
    [...feedback.competencies]
      .sort(
        (a,b)=>
          b.averageScore-a.averageScore
      )

  return {

    overallScore:
      Number(
        feedback.overallScore.toFixed(1)
      ),

    competencies,

    strongestCompetency:
      competencies[0] ?? null,

    weakestCompetency:
      competencies.at(-1) ?? null,

  }

}
