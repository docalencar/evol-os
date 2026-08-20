import { createPositionSeniorityProfileRepository } from "../repositories/position-seniority-profile-repository"
import {
  presentPositionSeniorities,
  type PositionSenioritiesViewModel,
} from "../presenters/present-position-seniorities"

export async function getPositionSeniorities(
  companyId: string,
  positionId: string
): Promise<PositionSenioritiesViewModel> {
  const repository = await createPositionSeniorityProfileRepository()

  const [profilesResult, catalogResult] = await Promise.all([
    repository.findByPosition(companyId, positionId),
    repository.findSeniorityCatalog(companyId),
  ])

  if (profilesResult.error || catalogResult.error) {
    throw new Error("Não foi possível carregar as senioridades do cargo.")
  }

  return presentPositionSeniorities({
    profiles: profilesResult.data ?? [],
    catalog: catalogResult.data ?? [],
  })
}
