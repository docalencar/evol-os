import { createPositionCompetencyRepository } from "../repositories/position-competency-repository"

export async function getPositionCompetenciesByPosition(
  companyId: string,
  positionId: string
) {
  const repository = await createPositionCompetencyRepository()

  const { data, error } = await repository.findByPosition(
    companyId,
    positionId
  )

  if (error) {
    throw error
  }

  return data
}
