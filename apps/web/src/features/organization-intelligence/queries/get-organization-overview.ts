import { getEmployees } from "@/features/people"
import { getDepartments } from "@/features/organization/departments"
import { getPositions } from "@/features/organization/positions"

import type { OrganizationOverview } from "../types/organization-overview"

export async function getOrganizationOverview(
  companyId: string
): Promise<OrganizationOverview> {
  const [
    employees,
    departments,
    positions,
  ] = await Promise.all([
    getEmployees(companyId),
    getDepartments(companyId),
    getPositions(companyId),
  ])

  return {
    totalEmployees: employees.length,
    departments: departments.length,
    positions: positions.length,
  }
}
