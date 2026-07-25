import type {
  PlanningChangeSetPayload,
  PlanningChangeType,
} from "../../change-sets"

export type CreateWorkspaceCommand = Readonly<{
  companyId: string
  workspaceId: string
  initialSnapshotId: string
  occurredAt: Date
}>

export type CreateScenarioCommand = Readonly<{
  companyId: string
  scenarioId: string
  workspaceId: string
  baseSnapshotId: string
  name: string
  description?: string | null
  occurredAt: Date
}>

export type CreatePlanningChangeSetCommand = {
  [TChangeType in PlanningChangeType]: Readonly<{
    companyId: string
    changeSetId: string
    scenarioId: string
    changeType: TChangeType
    payload: PlanningChangeSetPayload<TChangeType>
    occurredAt: Date
  }>
}[PlanningChangeType]

export type PublishScenarioCommand = Readonly<{
  companyId: string
  scenarioId: string
  snapshotId: string
  expectedVersion: number
  occurredAt: Date
}>

export type ArchiveScenarioCommand = Readonly<{
  companyId: string
  scenarioId: string
  expectedVersion: number
  occurredAt: Date
}>
