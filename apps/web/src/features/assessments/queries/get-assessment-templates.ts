import { createAssessmentTemplateRepository } from "../repositories/assessment-template-repository"

export async function getAssessmentTemplates(companyId: string) {
  const repository = await createAssessmentTemplateRepository()

  const { data, error } = await repository.findAllByCompany(companyId)

  if (error) {
    throw error
  }

  return data
}
