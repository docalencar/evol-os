import { createDevelopmentActionRepository } from "../repositories/development-action-repository"

export async function getDevelopmentActionsByPlan(
  companyId: string,
  planId: string
) {
  const repository =
    await createDevelopmentActionRepository()

  const { data, error } =
    await repository.findByPlan(
      companyId,
      planId
    )

  if (error) {
    throw new Error(
      "Erro ao buscar as ações do plano."
    )
  }

  return data ?? []
}
