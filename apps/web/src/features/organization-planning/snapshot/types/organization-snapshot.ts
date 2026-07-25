import type {
  SnapshotDepartment,
} from "./snapshot-department"
import type {
  SnapshotEmployee,
} from "./snapshot-employee"
import type {
  SnapshotPosition,
} from "./snapshot-position"
import type {
  SnapshotTeam,
} from "./snapshot-team"

export const ORGANIZATION_SNAPSHOT_SCHEMA_VERSION = 1 as const

export type OrganizationSnapshotSchemaVersion =
  typeof ORGANIZATION_SNAPSHOT_SCHEMA_VERSION

export type OrganizationSnapshot = Readonly<{
  schemaVersion: OrganizationSnapshotSchemaVersion
  generatedAt: string

  departments: readonly SnapshotDepartment[]
  teams: readonly SnapshotTeam[]
  positions: readonly SnapshotPosition[]
  employees: readonly SnapshotEmployee[]
}>
