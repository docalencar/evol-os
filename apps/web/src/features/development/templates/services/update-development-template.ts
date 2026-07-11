import { createDevelopmentTemplateRepository } from "../repositories/development-template-repository"

import type {
  UpdateDevelopmentTemplateInput,
} from "../schemas/development-template-schema"

type UpdateDevelopmentTemplateParams = {
  companyId: string
  templateId: string
  input: UpdateDevelopmentTemplateInput
}

export async function updateDevelopmentTemplate({
  companyId,
  templateId,
  input,
}: UpdateDevelopmentTemplateParams) {
  const repository =
    await createDevelopmentTemplateRepository()

  const { data, error } =
    await repository.update(
      companyId,
      templateId,
      input
    )

  if (error) {
    throw error
  }

  return data
}
