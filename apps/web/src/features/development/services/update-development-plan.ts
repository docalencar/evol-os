import {
  createDevelopmentPlanRepository,
} from "../repositories/development-plan-repository"

import type {
  UpdateDevelopmentPlanInput,
} from "../schemas/development-plan-schema"

export async function updateDevelopmentPlan(
  companyId: string,
  planId: string,
  input: UpdateDevelopmentPlanInput
) {
  const repository =
    await createDevelopmentPlanRepository()

  const existingPlan =
    await repository.findById(
      companyId,
      planId
    )

  if (existingPlan.error) {
    throw new Error(
      "Erro ao localizar o plano de desenvolvimento."
    )
  }

  if (!existingPlan.data) {
    throw new Error(
      "Plano de desenvolvimento não encontrado."
    )
  }

  if (
    existingPlan.data.status === "completed" ||
    existingPlan.data.status === "cancelled"
  ) {
    throw new Error(
      "Planos concluídos ou cancelados são somente leitura."
    )
  }

  const { data, error } =
    await repository.update(
      companyId,
      planId,
      input
    )

  if (error) {
    throw new Error(
      "Não foi possível atualizar o plano."
    )
  }

  return data
}