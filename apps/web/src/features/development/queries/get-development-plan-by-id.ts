import { createDevelopmentPlanRepository } from "../repositories/development-plan-repository"

export async function getDevelopmentPlanById(
  companyId: string,
  planId: string
) {
  const repository =
    await createDevelopmentPlanRepository()

  const { data, error } =
    await repository.findById(
      companyId,
      planId
    )

  if (error) {
    throw new Error(
      "Erro ao buscar o plano de desenvolvimento."
    )
  }

  return data
}
