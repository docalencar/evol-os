import { createPositionRepository } from "../repositories/position-repository"

export async function getPositions(companyId: string) {
  const repository = await createPositionRepository()

  const { data, error } = await repository.findAllByCompany(companyId)

  if (error) {
    throw error
  }

  return data ?? []
}
