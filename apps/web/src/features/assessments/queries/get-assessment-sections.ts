import { createAssessmentSectionRepository } from "../repositories/assessment-section-repository"

export async function getAssessmentSections(
  companyId: string,
  assessmentTemplateId: string
) {
  const repository = await createAssessmentSectionRepository()

  const { data, error } = await repository.findAllByTemplate(
    companyId,
    assessmentTemplateId
  )

  if (error) {
    throw error
  }

  return data
}
