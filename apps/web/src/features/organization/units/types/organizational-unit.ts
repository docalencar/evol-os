export type OrganizationalUnitType =
  | "holding"
  | "business_unit"


export type OrganizationalUnitStatus =
  | "active"
  | "inactive"


export type OrganizationalUnit = Readonly<{
  id: string

  companyId: string

  parentId: string | null

  name: string

  type: OrganizationalUnitType

  status: OrganizationalUnitStatus

  createdAt: string

  updatedAt: string
}>