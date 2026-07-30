import type { PlanningScenario } from "../../domain/planning-scenario"
import type { PublishedSnapshot } from "../../domain/published-snapshot"
import type { PlanningScenarioStatus } from "../../types/planning-contracts"

export type PlanningTimelineInput = Readonly<{
  workspaceId: string
  includeArchived?: boolean
}>

export type PlanningTimelineEntry = Readonly<{
  id: string
  version: number
  name: string
  status: PlanningScenarioStatus
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  author: string | null
  baselineVersion: number | null
  current: boolean
  published: boolean
}>

export type PlanningTimeline = Readonly<{
  workspaceId: string
  items: readonly PlanningTimelineEntry[]
}>

export interface PlanningTimelineScenarioSource {
  findAllByCompany(companyId: string): Promise<readonly PlanningScenario[]>
}

export interface PlanningTimelineSnapshotSource {
  findAllByCompany(companyId: string): Promise<readonly PublishedSnapshot[]>
}
