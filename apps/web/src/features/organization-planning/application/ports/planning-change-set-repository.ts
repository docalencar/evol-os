import type { ChangeSet } from "../../types/planning-contracts"

export type ListPlanningChangeSetsInput = Readonly<{
  companyId: string
  scenarioId: string
}>

export interface PlanningChangeSetRepository {
  /** Compatibility-only port. Planning has no active direct-table Change Set mutation. */
  create(changeSet: ChangeSet): Promise<void>
  listPublishableByScenario(
    input: ListPlanningChangeSetsInput
  ): Promise<readonly ChangeSet[]>
}
