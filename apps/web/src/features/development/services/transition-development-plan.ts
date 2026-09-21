import { createDevelopmentPlanRepository } from "../repositories/development-plan-repository"

export async function activateDevelopmentPlan(companyId: string, planId: string) {
  const repository = await createDevelopmentPlanRepository()
  const result = await repository.activate(companyId, planId)
  if (result.error || !result.data) throw new Error("Não foi possível ativar o plano.")
  return result.data
}

export async function completeDevelopmentPlan(companyId: string, planId: string) {
  const repository = await createDevelopmentPlanRepository()
  const result = await repository.complete(companyId, planId)
  if (result.error || !result.data) throw new Error("Não foi possível concluir o plano. Verifique os pré-requisitos.")
  return result.data
}
