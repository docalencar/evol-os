import { createDevelopmentActionRepository } from "../repositories/development-action-repository"

export async function getDevelopmentActionsByGoalIds(
  companyId: string,
  goalIds: string[]
) {
  const repository =
    await createDevelopmentActionRepository()

  const { data, error } =
    await repository.findByGoalIds(
      companyId,
      goalIds
    )

  if (error) {
    throw new Error(
      "Erro ao buscar as ações do plano."
    )
  }

  return data ?? []
}
