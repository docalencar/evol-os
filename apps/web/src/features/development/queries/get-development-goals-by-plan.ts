import { createDevelopmentGoalRepository } from "../repositories/development-goal-repository"

export async function getDevelopmentGoalsByPlan(
  companyId: string,
  planId: string
) {
  const repository =
    await createDevelopmentGoalRepository()

  const { data, error } =
    await repository.findByPlan(
      companyId,
      planId
    )

  if (error) {
    throw new Error(
      "Erro ao buscar os objetivos do plano."
    )
  }

  return data ?? []
}
