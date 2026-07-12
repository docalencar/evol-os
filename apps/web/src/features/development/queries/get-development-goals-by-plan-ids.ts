import {
  createDevelopmentGoalRepository,
} from "../repositories/development-goal-repository"

export async function getDevelopmentGoalsByPlanIds(
  companyId: string,
  planIds: string[]
) {
  const repository =
    await createDevelopmentGoalRepository()

  const { data, error } =
    await repository.findByPlanIds(
      companyId,
      planIds
    )

  if (error) {
    throw new Error(
      "Erro ao buscar objetivos dos planos."
    )
  }

  return data ?? []
}
