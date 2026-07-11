import { createDevelopmentTemplateRepository } from "../repositories/development-template-repository"

type DeactivateDevelopmentTemplateParams = {
  companyId: string
  templateId: string
}

export async function deactivateDevelopmentTemplate({
  companyId,
  templateId,
}: DeactivateDevelopmentTemplateParams) {
  const repository =
    await createDevelopmentTemplateRepository()

  const { data, error } =
    await repository.deactivate(
      companyId,
      templateId
    )

  if (error) {
    throw error
  }

  return data
}
