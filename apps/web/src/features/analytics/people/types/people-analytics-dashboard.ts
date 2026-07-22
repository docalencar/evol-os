export type OrganizationOccupancy = {
  current: number
  ideal: number
  difference: number
  percentage: number | null
}

export type PeopleAnalyticsDashboard = {
  headcount: number
  openJobs: number
  pendingApprovals: number
  organizationOccupancy: OrganizationOccupancy
}

export type PeopleAnalyticsDashboardViewModel = {
  headcount: string
  openJobs: string
  pendingApprovals: string
  organizationOccupancy: {
    current: string
    ideal: string
    difference: string
    percentage: string
    isAvailable: boolean
  }
  isEmpty: boolean
}
