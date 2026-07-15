import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"

export async function getAssessmentResponsesByCycle(
  companyId: string,
  assessmentCycleId: string
) {
  const repository =
    await createAssessmentResponseRepository()

  const { data, error } =
    await repository.findByCycle(
      companyId,
      assessmentCycleId
    )

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}
