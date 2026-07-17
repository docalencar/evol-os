export type TeamDetailsViewModel = {
  id: string
  companyId: string

  name: string
  description: string

  parentTeamId: string | null
  parentTeamStatusLabel: string

  leaderId: string | null
  leadershipStatusLabel: string

  statusLabel: string
  createdAtLabel: string
  updatedAtLabel: string
}
