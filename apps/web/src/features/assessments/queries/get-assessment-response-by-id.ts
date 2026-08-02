import { isAdministrativeRole } from "@/features/authorization"

import { readAssessmentAdministratively } from "../application/assessment-administrative-read-service"
import { requireAssessmentEvaluator } from "../application/assessment-authorization"
import { loadAssessmentActor } from "../application/load-assessment-actor"
import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"

export async function getAssessmentResponseById(
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
      "view_assessment_response"
    )

    return result.responses[0] ?? null
  }

  const repository =
    await createAssessmentResponseRepository()

  const { data, error } = await repository.findById(
    companyId,
    assessmentResponseId
  )

  if (error) {
    throw error
  }

  if (data) {
    requireAssessmentEvaluator(actor, data, "read")
  }

  return data
}
