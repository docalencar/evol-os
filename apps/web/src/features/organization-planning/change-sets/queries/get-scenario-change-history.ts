import type {
  PlanningChangeSet,
} from "../index"
import {
  createPlanningChangeSetRepository,
  type PlanningChangeSetRepository,
} from "../repositories"

export type GetScenarioChangeHistoryInput = Readonly<{
  companyId: string
  scenarioId: string
}>

export type ScenarioChangeHistory = Readonly<{
  scenarioId: string
  changeSets: readonly PlanningChangeSet[]
  totalChanges: number
  firstChangedAt: string | null
  lastChangedAt: string | null
}>

export async function getScenarioChangeHistory(
  input: GetScenarioChangeHistoryInput,
  repository?: PlanningChangeSetRepository
): Promise<ScenarioChangeHistory> {
  const planningChangeSetRepository =
    repository ??
    (await createPlanningChangeSetRepository())

  const changeSets =
    await planningChangeSetRepository.findByScenario(
      input.companyId,
      input.scenarioId
    )

  return {
    scenarioId: input.scenarioId,
    changeSets,
    totalChanges: changeSets.length,
    firstChangedAt:
      changeSets.length > 0
        ? changeSets[0].createdAt
        : null,
    lastChangedAt:
      changeSets.length > 0
        ? changeSets[changeSets.length - 1].updatedAt
        : null,
  }
}
