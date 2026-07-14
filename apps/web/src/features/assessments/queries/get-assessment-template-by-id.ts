import { createAssessmentTemplateRepository } from "../repositories/assessment-template-repository"

export async function getAssessmentTemplateById(
  companyId: string,
  assessmentTemplateId: string
) {
  const repository = await createAssessmentTemplateRepository()

  const { data, error } = await repository.findById(
    companyId,
    assessmentTemplateId
  )

  if (error) {
    throw error
  }

  return data
}