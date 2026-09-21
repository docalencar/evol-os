import { createDevelopmentActionRepository } from "../repositories/development-action-repository"
import { createDevelopmentPlanRepository } from "../repositories/development-plan-repository"

export async function executeDevelopmentAction(
  companyId: string,
  planId: string,
  actionId: string,
  transition: "start" | "complete" | "skip",
  reason?: string
) {
  const actions = await createDevelopmentActionRepository()
  const result = await actions.transition(companyId, planId, actionId, transition, reason)
  if (result.error || !result.data) throw new Error("Não foi possível atualizar a ação.")

  const plans = await createDevelopmentPlanRepository()
  const canonicalPlan = await plans.findById(companyId, planId)
  if (canonicalPlan.error || !canonicalPlan.data) {
    throw new Error("A ação foi atualizada, mas a releitura do plano falhou.")
  }
  return { action: result.data, plan: canonicalPlan.data }
}
