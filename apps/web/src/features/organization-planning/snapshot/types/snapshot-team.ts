export type SnapshotTeam = Readonly<{
  id: string

  name: string
  description: string | null

  departmentId: string | null
  parentTeamId: string | null
  leaderId: string | null

  archivedAt: string | null
}>
