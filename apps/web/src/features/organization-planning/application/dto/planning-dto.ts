import type {
  PlanningScenarioStatus,
} from "../../types/planning-contracts"

export type SnapshotDTO = Readonly<{
  id: string
  companyId: string
  workspaceId: string
  sourceScenarioId: string | null
  version: number
  publishedAt: string
}>

export type WorkspaceDTO = Readonly<{
  id: string
  companyId: string
  version: number
  createdAt: string
  updatedAt: string
  initialSnapshot: SnapshotDTO
}>

export type ScenarioDTO = Readonly<{
  id: string
  companyId: string
  workspaceId: string
  baseSnapshotId: string
  name: string
  description: string | null
  status: PlanningScenarioStatus
  version: number
  createdAt: string
  updatedAt: string
}>

export type PublishedScenarioDTO = Readonly<{
  scenario: ScenarioDTO
  snapshot: SnapshotDTO
}>
