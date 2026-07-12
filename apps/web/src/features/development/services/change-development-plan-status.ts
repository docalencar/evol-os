import {
  createDevelopmentPlanRepository,
} from "../repositories/development-plan-repository"

import type {
  DevelopmentPlanStatus,
} from "../constants/development-plan"

const ALLOWED_TRANSITIONS: Record<
  DevelopmentPlanStatus,
  DevelopmentPlanStatus[]
> = {
  draft: ["active"],

  active: [
    "completed",
    "cancelled",
  ],

  completed: ["active"],

  cancelled: ["active"],
}

export async function changeDevelopmentPlanStatus(
  companyId: string,
  planId: string,
  status: DevelopmentPlanStatus
) {
  const repository =
    await createDevelopmentPlanRepository()

  const existing =
    await repository.findById(
      companyId,
      planId
    )

  if (existing.error) {
    throw new Error(
      "Erro ao localizar o plano."
    )
  }

  if (!existing.data) {
    throw new Error(
      "Plano de desenvolvimento não encontrado."
    )
  }

  const currentStatus =
    existing.data.status

  const allowed =
    ALLOWED_TRANSITIONS[
      currentStatus
    ]

  if (!allowed.includes(status)) {
    throw new Error(
      `Não é permitido alterar um plano ${currentStatus} para ${status}.`
    )
  }

  const completedAt =
    status === "completed"
      ? new Date().toISOString()
      : null

  const { data, error } =
    await repository.updateStatus(
      companyId,
      planId,
      {
        status,
        completedAt,
      }
    )

  if (error) {
    throw new Error(
      "Não foi possível atualizar o status do plano."
    )
  }

  return data
}