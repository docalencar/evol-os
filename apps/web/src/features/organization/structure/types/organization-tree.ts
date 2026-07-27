export type OrganizationNodeType =
  | "unit"
  | "department"
  | "team"
  | "position"


export type OrganizationTreeNode = {
  id: string

  name: string

  type: OrganizationNodeType

  metadata?: {
    hierarchicalLevel?: string
  }

  children: OrganizationTreeNode[]
}
