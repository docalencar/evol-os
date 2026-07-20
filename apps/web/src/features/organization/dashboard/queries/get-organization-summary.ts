import { getDepartments } from "../../departments/queries/get-departments"
import { getPositions } from "../../positions/queries/get-positions"
import { getTeams } from "../../teams/queries/get-teams"

export type OrganizationSummary = {
  departments: number
  teams: number
  positions: number
}

export async function getOrganizationSummary(
  companyId: string
): Promise<OrganizationSummary> {
  const [
    departments,
    positions,
    teams,
  ] = await Promise.all([
    getDepartments(companyId),
    getPositions(companyId),
    getTeams(companyId),
  ])

  return {
    departments: departments.length,
    positions: positions.length,
    teams: teams.length,
  }
}
