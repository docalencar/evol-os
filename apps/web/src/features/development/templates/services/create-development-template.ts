import {
  createDevelopmentTemplateRepository,
} from "../repositories/development-template-repository"

import type {
  CreateDevelopmentTemplateInput,
} from "../schemas/development-template-schema"

type CreateDevelopmentTemplateParams = {
  companyId: string
  createdBy: string
  input: CreateDevelopmentTemplateInput
}

export async function createDevelopmentTemplate({
  companyId,
  createdBy,
  input,
}: CreateDevelopmentTemplateParams) {
  const repository =
    await createDevelopmentTemplateRepository()

  const { data, error } =
    await repository.create(
      companyId,
      createdBy,
      input
    )

  if (error) {
    throw error
  }

  return data
}
