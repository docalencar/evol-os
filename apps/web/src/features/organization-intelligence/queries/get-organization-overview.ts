import { getEmployees } from "@/features/people"
import { getDepartments } from "@/features/organization/departments"
import { getPositions } from "@/features/organization/positions"
import { getOrganizationalUnits } from "@/features/organization/units"

import type {
  OrganizationOverview,
} from "../types/organization-overview"


export async function getOrganizationOverview(
  companyId: string
): Promise<OrganizationOverview> {

  const [
    employees,
    departments,
    positions,
    organizationalUnits,
  ] = await Promise.all([
    getEmployees(companyId),
    getDepartments(companyId),
    getPositions(companyId),
    getOrganizationalUnits(companyId),
  ])


  const departmentsWithoutUnit =
    departments.filter(
      (department) =>
        !department.organization_unit_id
    ).length


  return {
    totalEmployees:
      employees.length,

    organizationalUnits:
      organizationalUnits.length,

    departments:
      departments.length,

    positions:
      positions.length,

    departmentsWithoutUnit,
  }
}