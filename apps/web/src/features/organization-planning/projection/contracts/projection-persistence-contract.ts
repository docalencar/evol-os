import type {
  ProjectedOrganization,
  ProjectionIssue,
  ProjectionMetrics,
} from "./projection-contracts"

export const PROJECTION_STATUSES = [
  "generating",
  "completed",
  "published",
] as const

export type ProjectionStatus =
  (typeof PROJECTION_STATUSES)[number]

export type ProjectionManifest = Readonly<{
  projectionVersion: number
  engineVersion: string
  schemaVersion: string
  changeSetCount: number
  executedChangeSets: number
  warningCount: number
  errorCount: number
  durationMs: number
  generatedAt: Date
}>

export type ProjectionContract = Readonly<{
  id: string
  companyId: string
  workspaceId: string
  scenarioId: string
  sourceSnapshotId: string

  version: number
  status: ProjectionStatus

  organization: ProjectedOrganization
  metrics: ProjectionMetrics

  warnings: readonly ProjectionIssue[]
  errors: readonly ProjectionIssue[]

  manifest: ProjectionManifest

  createdAt: Date
  updatedAt: Date
}>
