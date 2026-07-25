export const SNAPSHOT_POSITION_HIERARCHICAL_LEVELS = [
  "intern",
  "assistant",
  "analyst",
  "specialist",
  "coordinator",
  "supervisor",
  "manager",
  "director",
  "executive",
] as const

export type SnapshotPositionHierarchicalLevel =
  (typeof SNAPSHOT_POSITION_HIERARCHICAL_LEVELS)[number]

export const SNAPSHOT_POSITION_STATUSES = [
  "draft",
  "active",
  "inactive",
  "obsolete",
] as const

export type SnapshotPositionStatus =
  (typeof SNAPSHOT_POSITION_STATUSES)[number]

export const SNAPSHOT_POSITION_WORK_MODELS = [
  "on_site",
  "hybrid",
  "remote",
] as const

export type SnapshotPositionWorkModel =
  (typeof SNAPSHOT_POSITION_WORK_MODELS)[number]

export const SNAPSHOT_POSITION_EMPLOYMENT_TYPES = [
  "clt",
  "pj",
  "intern",
  "apprentice",
  "temporary",
  "outsourced",
  "contractor",
  "other",
] as const

export type SnapshotPositionEmploymentType =
  (typeof SNAPSHOT_POSITION_EMPLOYMENT_TYPES)[number]

export const SNAPSHOT_POSITION_TRAVEL_REQUIREMENTS = [
  "none",
  "occasional",
  "frequent",
] as const

export type SnapshotPositionTravelRequirement =
  (typeof SNAPSHOT_POSITION_TRAVEL_REQUIREMENTS)[number]

export type SnapshotPosition = Readonly<{
  id: string

  name: string
  description: string | null

  departmentId: string | null
  teamId: string | null
  reportsToPositionId: string | null

  hierarchicalLevel: SnapshotPositionHierarchicalLevel
  status: SnapshotPositionStatus

  weeklyWorkloadHours: number
  workModel: SnapshotPositionWorkModel
  employmentType: SnapshotPositionEmploymentType
  travelRequirement: SnapshotPositionTravelRequirement

  archivedAt: string | null
}>
