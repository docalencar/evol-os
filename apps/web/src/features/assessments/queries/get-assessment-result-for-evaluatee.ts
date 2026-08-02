import { loadAssessmentActor } from "../application/load-assessment-actor"
import { readAssessmentResultForEvaluatee } from "../repositories/assessment-secure-read-repository"
import type { AssessmentEvaluateeResult } from "../types/assessment-secure-read"

export async function getAssessmentResultForEvaluatee(
  companyId: string,
  assessmentResponseId: string
): Promise<AssessmentEvaluateeResult> {
  const actor = await loadAssessmentActor()

  if (actor.companyId !== companyId || !actor.personId) {
    throw new Error("ASSESSMENT_ACCESS_DENIED")
  }

  return readAssessmentResultForEvaluatee(
    companyId,
    assessmentResponseId
  )
}
