export type OrganizationSyncReviewItemViewModel = {
  id: string
  title: string
  description: string
  operationLabel: string
  severity: "info" | "warning" | "critical"
}

export type OrganizationSyncReviewGroupViewModel = {
  id: "department" | "team" | "position" | "employee"
  title: string
  itemCount: number
  items: OrganizationSyncReviewItemViewModel[]
}

export type OrganizationSyncReviewViewModel = {
  totalItems: number
  reviewItems: number
  unchangedItems: number
  groups: OrganizationSyncReviewGroupViewModel[]
}
