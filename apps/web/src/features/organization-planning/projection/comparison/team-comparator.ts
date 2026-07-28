import type { ProjectedTeam } from "../contracts"
import type { TeamComparison } from "./comparison-contracts"
import { compareStructuralEntities } from "./comparison-support"

const TEAM_COMPARISON_FIELDS = Object.freeze([
  "name",
  "code",
  "description",
  "departmentId",
] as const)

export function compareTeams(
  baseTeams: readonly ProjectedTeam[],
  projectedTeams: readonly ProjectedTeam[]
): TeamComparison {
  return compareStructuralEntities(
    baseTeams,
    projectedTeams,
    TEAM_COMPARISON_FIELDS
  )
}
