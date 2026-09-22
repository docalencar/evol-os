import type { ChangeSet } from "../../types/planning-contracts"

export type ListPlanningChangeSetsInput = Readonly<{
  companyId: string
  scenarioId: string
}>

export interface PlanningChangeSetRepository {
  listPublishableByScenario(
    input: ListPlanningChangeSetsInput
  ): Promise<readonly ChangeSet[]>
}

export type CreatePlanningChangeSetInput = Readonly<{
  scenarioId: string
  expectedVersion: number
  changeSetId: string
  changeType: string
  payload: Readonly<Record<string, unknown>>
}>

export type ReplacePlanningChangeSetInput = CreatePlanningChangeSetInput &
  Readonly<{ currentChangeSetId: string }>

export type RemovePlanningChangeSetInput = Readonly<{
  scenarioId: string
  expectedVersion: number
  changeSetId: string
}>

export type ReorderPlanningChangeSetsInput = Readonly<{
  scenarioId: string
  expectedVersion: number
  orderedChangeSetIds: readonly string[]
}>

export interface PlanningChangeSetMutationRepository
  extends PlanningChangeSetRepository {
  createTrusted(input: CreatePlanningChangeSetInput): Promise<void>
  replaceTrusted(input: ReplacePlanningChangeSetInput): Promise<void>
  removeTrusted(input: RemovePlanningChangeSetInput): Promise<void>
  reorderTrusted(input: ReorderPlanningChangeSetsInput): Promise<void>
}
