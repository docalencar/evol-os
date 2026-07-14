import { createAssessmentCycleRepository } from "../repositories/assessment-cycle-repository"

export async function getAssessmentCycles(companyId: string) {
  const repository = await createAssessmentCycleRepository()

  const { data, error } = await repository.findAllByCompany(companyId)

  if (error) {
    throw error
  }

  return data
}