import { createDevelopmentTemplateRepository } from "../repositories/development-template-repository"

export async function getDevelopmentTemplates(
  companyId: string
) {
  const repository =
    await createDevelopmentTemplateRepository()

  const { data, error } =
    await repository.findAll(companyId)

  if (error) {
    throw error
  }

  return data ?? []
}
