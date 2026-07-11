import { createDevelopmentTemplateGoalRepository } from "../repositories/development-template-goal-repository"

export async function getDevelopmentTemplateGoals(
  templateId: string
) {
  const repository =
    await createDevelopmentTemplateGoalRepository()

  const { data, error } =
    await repository.findByTemplate(templateId)

  if (error) {
    throw error
  }

  return data ?? []
}
