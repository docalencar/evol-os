export type TeamWorkspaceMemberViewModel = {
  id: string
  name: string
  email: string
  statusLabel: string
  positionLabel: string
  profileHref: string
  isLeader: boolean
}

export type TeamWorkspaceMetricViewModel = {
  id:
    | "employees"
    | "positions"
    | "leadership"
    | "subteams"
  label: string
  value: number | string
  description: string
}

export type TeamWorkspaceViewModel = {
  metrics: TeamWorkspaceMetricViewModel[]
  members: TeamWorkspaceMemberViewModel[]
  visibleMembers: TeamWorkspaceMemberViewModel[]
  totalMembers: number
  hasMembers: boolean
  remainingMembers: number
  leaderName: string | null
}
