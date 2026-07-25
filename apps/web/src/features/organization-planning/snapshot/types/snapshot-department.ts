export type SnapshotDepartment = Readonly<{
  id: string

  name: string
  description: string | null

  parentDepartmentId: string | null
  leaderId: string | null

  archivedAt: string | null
}>
