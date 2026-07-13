import {
  createPositionRequirementRepository,
} from "../repositories/position-requirement-repository"

export async function getPositionRequirementsByPosition(
  companyId: string,
  positionId: string
) {
  const repository =
    await createPositionRequirementRepository()

  const { data, error } =
    await repository.findByPosition(
      companyId,
      positionId
    )

  if (error) {
    throw error
  }

  return data ?? []
}
