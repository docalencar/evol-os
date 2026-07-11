import { createDevelopmentTemplateActionRepository } from "../repositories/development-template-action-repository"

export async function getDevelopmentTemplateActions(
  templateGoalId: string
) {
  const repository =
    await createDevelopmentTemplateActionRepository()

  const { data, error } =
    await repository.findByGoal(templateGoalId)

  if (error) {
    throw error
  }

  return data ?? []
}
