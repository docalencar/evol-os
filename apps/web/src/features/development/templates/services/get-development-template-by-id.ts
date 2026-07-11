import { createDevelopmentTemplateRepository } from "../repositories/development-template-repository"

export async function getDevelopmentTemplateById(
  companyId: string,
  templateId: string
) {
  const repository =
    await createDevelopmentTemplateRepository()

  const { data, error } = await repository.findById(
    companyId,
    templateId
  )

  if (error) {
    throw error
  }

  return data
}
