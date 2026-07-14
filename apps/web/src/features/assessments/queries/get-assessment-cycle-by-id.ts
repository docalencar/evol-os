import { createAssessmentCycleRepository } from "../repositories/assessment-cycle-repository"

export async function getAssessmentCycleById(
  companyId: string,
  assessmentCycleId: string
) {
  const repository = await createAssessmentCycleRepository()

  const { data, error } = await repository.findById(
    companyId,
    assessmentCycleId
  )

  if (error) {
    throw error
  }

  return data
}