export const SNAPSHOT_EMPLOYEE_STATUSES = [
  "active",
  "inactive",
  "on_leave",
  "terminated",
] as const

export type SnapshotEmployeeStatus =
  (typeof SNAPSHOT_EMPLOYEE_STATUSES)[number]

export const SNAPSHOT_EMPLOYEE_DISC_PROFILES = [
  "D",
  "I",
  "S",
  "C",
] as const

export type SnapshotEmployeeDiscProfile =
  (typeof SNAPSHOT_EMPLOYEE_DISC_PROFILES)[number]

export type SnapshotEmployee = Readonly<{
  id: string
  userId: string | null

  fullName: string
  email: string | null
  phone: string | null

  birthDate: string | null
  hireDate: string | null

  status: SnapshotEmployeeStatus

  departmentId: string | null
  teamId: string | null
  positionId: string | null
  managerEmployeeId: string | null

  discProfile: SnapshotEmployeeDiscProfile | null
  avatarUrl: string | null

  archivedAt: string | null
}>
