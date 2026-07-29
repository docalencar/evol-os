import type { ProjectedTeam } from "../contracts"
import type { TeamComparison } from "./comparison-contracts"
import { compareStructural } from "./structural-comparator"

const fields = Object.freeze(["name", "code", "description", "departmentId"] as const)
export function compareTeams(before: readonly ProjectedTeam[], after: readonly ProjectedTeam[]): TeamComparison {
  return compareStructural(before, after, fields, "teams")
}
