import { createPositionSeniorityCompetencyRepository } from "../repositories/position-seniority-competency-repository"
import {
  presentPositionSeniorityCompetencyMatrix,
  type PositionSeniorityCompetencyMatrixViewModel,
} from "../presenters/present-position-seniority-competency-matrix"

export async function getPositionSeniorityCompetencyMatrix(
  companyId: string,
  positionId: string,
  includeArchivedProfiles = false
): Promise<PositionSeniorityCompetencyMatrixViewModel> {
  const repository = await createPositionSeniorityCompetencyRepository()

  const result = await repository.findMatrixByPosition(
    companyId,
    positionId,
    includeArchivedProfiles
  )

  if (result.error) {
    throw new Error(
      "Não foi possível carregar a matriz de competências do cargo."
    )
  }

  return presentPositionSeniorityCompetencyMatrix({
    cells: result.data ?? [],
  })
}
