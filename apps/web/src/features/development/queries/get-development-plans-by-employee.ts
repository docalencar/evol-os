import { createDevelopmentPlanRepository } from "../repositories/development-plan-repository"

export async function getDevelopmentPlansByEmployee(
  companyId: string,
  employeeId: string
) {
  const repository = await createDevelopmentPlanRepository()
  const { data, error } = await repository.findByEmployee(companyId, employeeId)

  if (error) throw new Error("Erro ao buscar planos de desenvolvimento do colaborador.")

  return data ?? []
}
