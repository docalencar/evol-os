import { getDepartments } from "@/features/organization/departments"
import { getPositions } from "@/features/organization/positions"

import type { OrganizationStructure } from "../types/organization-structure"

export async function getOrganizationStructure(
  companyId: string
): Promise<OrganizationStructure> {
  const [departments, positions] = await Promise.all([
    getDepartments(companyId),
    getPositions(companyId),
  ])

  return {
    departments: departments.length,
    positions: positions.length,
    averagePositionsPerDepartment:
      departments.length === 0
        ? 0
        : Number(
            (positions.length / departments.length).toFixed(1)
          ),
  }
}
