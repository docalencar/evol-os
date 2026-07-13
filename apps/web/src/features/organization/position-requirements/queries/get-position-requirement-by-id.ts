import {
  createPositionRequirementRepository,
} from "../repositories/position-requirement-repository"

export async function getPositionRequirementById(
  companyId: string,
  positionRequirementId: string
) {
  const repository =
    await createPositionRequirementRepository()

  const { data, error } =
    await repository.findById(
      companyId,
      positionRequirementId
    )

  if (error) {
    throw error
  }

  return data
}
