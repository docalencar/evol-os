import type {
  PlanningChangeSet,
} from "../index"
import {
  createPlanningChangeSetRepository,
  type PlanningChangeSetRepository,
} from "../repositories"

export type GetPlanningChangeSetInput = Readonly<{
  companyId: string
  changeSetId: string
}>

export async function getPlanningChangeSet(
  input: GetPlanningChangeSetInput,
  repository?: PlanningChangeSetRepository
): Promise<PlanningChangeSet | null> {
  const planningChangeSetRepository =
    repository ??
    (await createPlanningChangeSetRepository())

  return planningChangeSetRepository.findById(
    input.companyId,
    input.changeSetId
  )
}
