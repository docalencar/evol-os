import type { SnapshotTeam } from "../types"
import type {
  OrganizationTeamReadRow,
} from "../services"

export function mapTeamToSnapshot(
  team: OrganizationTeamReadRow
): SnapshotTeam {
  return Object.freeze({
    id: team.id,
    name: team.name,
    description: team.description,
    departmentId: team.department_id,
    parentTeamId: team.parent_team_id,
    leaderId: team.manager_id,
    archivedAt: team.deleted_at,
  })
}
