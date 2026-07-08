export type TeamId = string

export interface Team {
  id: TeamId
  companyId: string

  name: string
  description: string | null

  parentTeamId: string | null
  leaderId: string | null

  createdAt: string
  updatedAt: string
  archivedAt: string | null
}
