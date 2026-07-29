import type { ChangeSet } from "../../types/planning-contracts"

export type ListPlanningChangeSetsInput = Readonly<{
  companyId: string
  scenarioId: string
}>

export interface PlanningChangeSetRepository {
  create(changeSet: ChangeSet): Promise<void>
  listPublishableByScenario(
    input: ListPlanningChangeSetsInput
  ): Promise<readonly ChangeSet[]>
}
