import { createDevelopmentTemplateActionRepository } from "../repositories/development-template-action-repository"

export async function getDevelopmentTemplateActionsByGoalIds(
  goalIds: string[]
) {
  const repository =
    await createDevelopmentTemplateActionRepository()

  const { data, error } =
    await repository.findByGoalIds(goalIds)

  if (error) {
    throw error
  }

  return data ?? []
}
