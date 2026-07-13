import {
  createPositionRequirementRepository,
} from "../repositories/position-requirement-repository"

export async function getPositionRequirements(
  companyId: string
) {
  const repository =
    await createPositionRequirementRepository()

  const { data, error } =
    await repository.findAll(
      companyId
    )

  if (error) {
    throw error
  }

  return data ?? []
}
