import type { SnapshotEmployee } from "../types"
import type {
  OrganizationEmployeeReadRow,
  OrganizationPositionReadRow,
  OrganizationTeamReadRow,
} from "../services"

type MapEmployeeToSnapshotContext = Readonly<{
  teamsById: ReadonlyMap<
    string,
    OrganizationTeamReadRow
  >
  positionsById: ReadonlyMap<
    string,
    OrganizationPositionReadRow
  >
}>

function resolveEmployeeDepartmentId(
  employee: OrganizationEmployeeReadRow,
  context: MapEmployeeToSnapshotContext
) {
  if (employee.team_id) {
    const team = context.teamsById.get(
      employee.team_id
    )

    if (team?.department_id) {
      return team.department_id
    }
  }

  if (employee.position_id) {
    const position = context.positionsById.get(
      employee.position_id
    )

    if (position?.department_id) {
      return position.department_id
    }
  }

  return null
}

export function mapEmployeeToSnapshot(
  employee: OrganizationEmployeeReadRow,
  context: MapEmployeeToSnapshotContext
): SnapshotEmployee {
  return Object.freeze({
    id: employee.id,
    userId: employee.user_id,
    fullName: employee.full_name,
    email: employee.email,
    phone: employee.phone,
    birthDate: employee.birth_date,
    hireDate: employee.hire_date,
    status: employee.status,
    departmentId: resolveEmployeeDepartmentId(
      employee,
      context
    ),
    teamId: employee.team_id,
    positionId: employee.position_id,
    managerEmployeeId: employee.manager_id,
    discProfile: employee.disc_profile,
    avatarUrl: employee.avatar_url,
    archivedAt:
      employee.status === "terminated"
        ? null
        : null,
  })
}
