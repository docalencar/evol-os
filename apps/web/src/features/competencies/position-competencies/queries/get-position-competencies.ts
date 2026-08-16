import { createPositionCompetencyRepository } from "../repositories/position-competency-repository"

export async function getPositionCompetencies(
  companyId: string
) {
  const repository =
    await createPositionCompetencyRepository()

  const { data, error } =
    await repository.findAll(companyId)

  if (error)
    throw new Error(
      "Não foi possível carregar as competências dos cargos."
    )

  return data
}
