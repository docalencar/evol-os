export type OrganizationComparison = {
  departments: {
    created: number
    updated: number
    removed: number
  }

  teams: {
    created: number
    updated: number
    removed: number
  }

  positions: {
    created: number
    updated: number
    removed: number
  }

  employees: {
    created: number
    updated: number
    removed: number
  }

  totalChanges: number
}
