import type {
  OrganizationSnapshot,
  SnapshotDepartment,
  SnapshotEmployee,
  SnapshotPosition,
  SnapshotTeam,
} from "../../snapshot"
import {
  freezeProjectedOrganization,
  type ProjectedDepartment,
  type ProjectedEmployee,
  type ProjectedOrganization,
  type ProjectedPosition,
  type ProjectedTeam,
  type ProjectionMetrics,
} from "../contracts"

export function bootstrapProjectedOrganization(
  snapshot: OrganizationSnapshot
): ProjectedOrganization {
  const departments = snapshot.departments.map(
    mapSnapshotDepartment
  )

  const teams = snapshot.teams.map(
    mapSnapshotTeam
  )

  const positions = snapshot.positions.map(
    mapSnapshotPosition
  )

  const employees = snapshot.employees.map(
    mapSnapshotEmployee
  )

  const metrics = calculateBootstrapMetrics({
    departments,
    positions,
    employees,
  })

  return freezeProjectedOrganization({
    departments,
    teams,
    positions,
    employees,
    vacancies: [],
    metrics,
  })
}

function mapSnapshotDepartment(
  department: SnapshotDepartment
): ProjectedDepartment {
  return Object.freeze({
    id: department.id,
    name: department.name,
    code: null,
    description: department.description,
    parentDepartmentId:
      department.parentDepartmentId,
    status:
      department.archivedAt === null
        ? "active"
        : "archived",
  })
}

function mapSnapshotTeam(
  team: SnapshotTeam
): ProjectedTeam {
  return Object.freeze({
    id: team.id,
    name: team.name,
    code: null,
    description: team.description,
    departmentId: team.departmentId,
    status:
      team.archivedAt === null
        ? "active"
        : "archived",
  })
}

function mapSnapshotPosition(
  position: SnapshotPosition
): ProjectedPosition {
  return Object.freeze({
    id: position.id,
    name: position.name,
    description: position.description,
    departmentId: position.departmentId,
    hierarchicalLevel:
      position.hierarchicalLevel,
    weeklyWorkloadHours:
      position.weeklyWorkloadHours,
    workModel: position.workModel,
    employmentType: position.employmentType,
    travelRequirement:
      position.travelRequirement,
    status:
      position.archivedAt === null &&
      position.status === "active"
        ? "active"
        : "archived",
  })
}

function mapSnapshotEmployee(
  employee: SnapshotEmployee
): ProjectedEmployee {
  return Object.freeze({
    id: employee.id,
    fullName: employee.fullName,
    email: employee.email,
    status: employee.status,
    managerId: employee.managerEmployeeId,
    departmentId: employee.departmentId,
    teamId: employee.teamId,
    positionId: employee.positionId,
  })
}

type BootstrapMetricsInput = Readonly<{
  departments: readonly ProjectedDepartment[]
  positions: readonly ProjectedPosition[]
  employees: readonly ProjectedEmployee[]
}>

function calculateBootstrapMetrics({
  departments,
  positions,
  employees,
}: BootstrapMetricsInput): ProjectionMetrics {
  return Object.freeze({
    headcount: employees.filter(
      (employee) =>
        employee.status !== "terminated"
    ).length,
    vacancies: 0,
    salaryMass: 0,
    departments: departments.filter(
      (department) =>
        department.status === "active"
    ).length,
    positions: positions.filter(
      (position) =>
        position.status === "active"
    ).length,
  })
}
