import { createDevelopmentPlanRepository } from "../repositories/development-plan-repository"

export async function getDevelopmentPlans(companyId: string) {
  const repository = await createDevelopmentPlanRepository()

  const { data, error } =
    await repository.findAllByCompany(companyId)

  if (error) {
    throw new Error("Erro ao buscar planos de desenvolvimento.")
  }

  return data
}
