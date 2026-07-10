import { createPositionCompetencyRepository } from "../repositories/position-competency-repository"

export async function getPositionCompetencyById(
  companyId: string,
  id: string
) {
  const repository = await createPositionCompetencyRepository()

  const { data, error } = await repository.findById(companyId, id)

  if (error) throw error

  return data
}
