import { getDepartments } from "@/features/organization/departments"
import { getPositions } from "@/features/organization/positions"
import { getOrganizationalUnits } from "@/features/organization/units"

import type {
  OrganizationStructure,
} from "../types/organization-structure"


export async function getOrganizationStructure(
  companyId: string
): Promise<OrganizationStructure> {

  const [
    departments,
    positions,
    organizationalUnits,
  ] = await Promise.all([
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
    organizationalUnits:
      organizationalUnits.length,

    departments:
      departments.length,

    positions:
      positions.length,

    departmentsWithoutUnit,

    averagePositionsPerDepartment:
      departments.length === 0
        ? 0
        : Number(
            (
              positions.length /
              departments.length
            ).toFixed(1)
          ),
  }
}