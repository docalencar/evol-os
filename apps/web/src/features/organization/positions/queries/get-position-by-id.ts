import { createPositionRepository } from "../repositories/position-repository"

export async function getPositionById(companyId: string, positionId: string) {
  const repository = await createPositionRepository()

  const { data, error } = await repository.findById(companyId, positionId)

  if (error) {
    throw error
  }

  return data
}
