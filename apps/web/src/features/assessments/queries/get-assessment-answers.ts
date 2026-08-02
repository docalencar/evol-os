import { isAdministrativeRole } from "@/features/authorization"

import { readAssessmentAdministratively } from "../application/assessment-administrative-read-service"
import { requireAssessmentEvaluator } from "../application/assessment-authorization"
import { loadAssessmentActor } from "../application/load-assessment-actor"
import { createAssessmentAnswerRepository } from "../repositories/assessment-answer-repository"
import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"

export async function getAssessmentAnswers(
  companyId: string,
  assessmentResponseId: string
) {
  const actor = await loadAssessmentActor()

  if (actor.companyId !== companyId) {
    throw new Error("ASSESSMENT_ACCESS_DENIED")
  }

  if (isAdministrativeRole(actor.role)) {
    const result = await readAssessmentAdministratively(
      companyId,
      "response",
      assessmentResponseId,
      "view_assessment_answers"
    )

    return result.answers
  }

  const responseRepository = await createAssessmentResponseRepository()
  const { data: response, error: responseError } =
    await responseRepository.findById(companyId, assessmentResponseId)

  if (responseError || !response) {
    throw new Error("ASSESSMENT_ACCESS_DENIED")
  }

  requireAssessmentEvaluator(actor, response, "read")

  const repository =
    await createAssessmentAnswerRepository()

  const { data, error } = await repository.findAllByResponse(
    companyId,
    assessmentResponseId
  )

  if (error) {
    throw error
  }

  return data
}
