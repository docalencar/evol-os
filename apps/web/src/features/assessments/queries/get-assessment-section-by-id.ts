import { createAssessmentSectionRepository } from "../repositories/assessment-section-repository"

export async function getAssessmentSectionById(
  companyId: string,
  assessmentSectionId: string
) {
  const repository = await createAssessmentSectionRepository()

  const { data, error } = await repository.findById(
    companyId,
    assessmentSectionId
  )

  if (error) {
    throw error
  }

  return data
}
