import type {
  PlanningChangeSet,
} from "../index"
import {
  createPlanningChangeSetRepository,
  type PlanningChangeSetRepository,
} from "../repositories"

export type GetPlanningChangeSetsInput = Readonly<{
  companyId: string
  scenarioId: string
}>

export async function getPlanningChangeSets(
  input: GetPlanningChangeSetsInput,
  repository?: PlanningChangeSetRepository
): Promise<PlanningChangeSet[]> {
  const planningChangeSetRepository =
    repository ??
    (await createPlanningChangeSetRepository())

  return planningChangeSetRepository.findByScenario(
    input.companyId,
    input.scenarioId
  )
}
