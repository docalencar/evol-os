export const PLANNING_SCENARIO_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "published",
  "archived",
] as const

export type PlanningScenarioStatus =
  (typeof PLANNING_SCENARIO_STATUSES)[number]

export type Version = number

export type Workspace = Readonly<{
  id: string
  companyId: string
  version: Version
  createdAt: Date
  updatedAt: Date
}>

export type PlanningScenarioContract = Readonly<{
  id: string
  companyId: string
  workspaceId: string
  baseSnapshotId: string
  name: string
  description: string | null
  status: PlanningScenarioStatus
  version: Version
  createdAt: Date
  updatedAt: Date
}>

export type PublishedSnapshotContract = Readonly<{
  id: string
  companyId: string
  workspaceId: string
  sourceScenarioId: string | null
  version: Version
  publishedAt: Date
}>

export type ChangeSet = Readonly<{
  id: string
  companyId: string
  scenarioId: string
  changeType: string
  payload: Readonly<Record<string, unknown>>
  version: Version
}>
