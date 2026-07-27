import {
  getDepartments,
} from "../../departments/queries/get-departments"

import {
  getPositions,
} from "../../positions/queries/get-positions"

import {
  getTeams,
} from "../../teams/queries/get-teams"

import {
  getOrganizationalUnits,
} from "../../units"

import type {
  OrganizationSummary,
} from "../types/organization-summary"


export async function getOrganizationSummary(
  companyId: string,
): Promise<OrganizationSummary> {

  const [
    organizationalUnits,
    departments,
    positions,
    teams,
  ] = await Promise.all([
    getOrganizationalUnits(companyId),
    getDepartments(companyId),
    getPositions(companyId),
    getTeams(companyId),
  ])


  return {
    organizationalUnits:
      organizationalUnits.length,

    departments:
      departments.length,

    positions:
      positions.length,

    teams:
      teams.length,
  }
}