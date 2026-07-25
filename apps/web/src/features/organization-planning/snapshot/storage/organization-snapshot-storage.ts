import {
  ORGANIZATION_SNAPSHOT_SCHEMA_VERSION,
  type OrganizationSnapshot,
  type SnapshotDepartment,
  type SnapshotEmployee,
  type SnapshotEmployeeDiscProfile,
  type SnapshotEmployeeStatus,
  type SnapshotPosition,
  type SnapshotPositionEmploymentType,
  type SnapshotPositionHierarchicalLevel,
  type SnapshotPositionStatus,
  type SnapshotPositionTravelRequirement,
  type SnapshotPositionWorkModel,
  type SnapshotTeam,
} from "../types"

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function requireObject(
  value: unknown,
  field: string
): JsonObject {
  if (!isObject(value)) {
    throw new Error(
      `Snapshot organizacional inválido: ${field} deve ser um objeto.`
    )
  }

  return value
}

function requireArray(
  value: unknown,
  field: string
): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `Snapshot organizacional inválido: ${field} deve ser uma lista.`
    )
  }

  return value
}

function requireString(
  value: unknown,
  field: string
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `Snapshot organizacional inválido: ${field} deve ser um texto.`
    )
  }

  return value
}

function requireNullableString(
  value: unknown,
  field: string
): string | null {
  if (value === null) {
    return null
  }

  return requireString(value, field)
}

function requireNumber(
  value: unknown,
  field: string
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `Snapshot organizacional inválido: ${field} deve ser um número.`
    )
  }

  return value
}

function requireEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  field: string
): T {
  if (
    typeof value !== "string" ||
    !values.includes(value as T)
  ) {
    throw new Error(
      `Snapshot organizacional inválido: ${field} possui valor desconhecido.`
    )
  }

  return value as T
}

const EMPLOYEE_STATUSES = [
  "active",
  "inactive",
  "on_leave",
  "terminated",
] as const satisfies readonly SnapshotEmployeeStatus[]

const EMPLOYEE_DISC_PROFILES = [
  "D",
  "I",
  "S",
  "C",
] as const satisfies readonly SnapshotEmployeeDiscProfile[]

const POSITION_HIERARCHICAL_LEVELS = [
  "intern",
  "assistant",
  "analyst",
  "specialist",
  "coordinator",
  "supervisor",
  "manager",
  "director",
  "executive",
] as const satisfies readonly SnapshotPositionHierarchicalLevel[]

const POSITION_STATUSES = [
  "draft",
  "active",
  "inactive",
  "obsolete",
] as const satisfies readonly SnapshotPositionStatus[]

const POSITION_WORK_MODELS = [
  "on_site",
  "hybrid",
  "remote",
] as const satisfies readonly SnapshotPositionWorkModel[]

const POSITION_EMPLOYMENT_TYPES = [
  "clt",
  "pj",
  "intern",
  "apprentice",
  "temporary",
  "outsourced",
  "contractor",
  "other",
] as const satisfies readonly SnapshotPositionEmploymentType[]

const POSITION_TRAVEL_REQUIREMENTS = [
  "none",
  "occasional",
  "frequent",
] as const satisfies readonly SnapshotPositionTravelRequirement[]

function parseDepartment(
  value: unknown,
  index: number
): SnapshotDepartment {
  const row = requireObject(
    value,
    `departments[${index}]`
  )

  return Object.freeze({
    id: requireString(
      row.id,
      `departments[${index}].id`
    ),
    name: requireString(
      row.name,
      `departments[${index}].name`
    ),
    description: requireNullableString(
      row.description,
      `departments[${index}].description`
    ),
    parentDepartmentId: requireNullableString(
      row.parentDepartmentId,
      `departments[${index}].parentDepartmentId`
    ),
    leaderId: requireNullableString(
      row.leaderId,
      `departments[${index}].leaderId`
    ),
    archivedAt: requireNullableString(
      row.archivedAt,
      `departments[${index}].archivedAt`
    ),
  })
}

function parseTeam(
  value: unknown,
  index: number
): SnapshotTeam {
  const row = requireObject(
    value,
    `teams[${index}]`
  )

  return Object.freeze({
    id: requireString(
      row.id,
      `teams[${index}].id`
    ),
    name: requireString(
      row.name,
      `teams[${index}].name`
    ),
    description: requireNullableString(
      row.description,
      `teams[${index}].description`
    ),
    departmentId: requireNullableString(
      row.departmentId,
      `teams[${index}].departmentId`
    ),
    parentTeamId: requireNullableString(
      row.parentTeamId,
      `teams[${index}].parentTeamId`
    ),
    leaderId: requireNullableString(
      row.leaderId,
      `teams[${index}].leaderId`
    ),
    archivedAt: requireNullableString(
      row.archivedAt,
      `teams[${index}].archivedAt`
    ),
  })
}

function parsePosition(
  value: unknown,
  index: number
): SnapshotPosition {
  const row = requireObject(
    value,
    `positions[${index}]`
  )

  return Object.freeze({
    id: requireString(
      row.id,
      `positions[${index}].id`
    ),
    name: requireString(
      row.name,
      `positions[${index}].name`
    ),
    description: requireNullableString(
      row.description,
      `positions[${index}].description`
    ),
    departmentId: requireNullableString(
      row.departmentId,
      `positions[${index}].departmentId`
    ),
    teamId: requireNullableString(
      row.teamId,
      `positions[${index}].teamId`
    ),
    reportsToPositionId: requireNullableString(
      row.reportsToPositionId,
      `positions[${index}].reportsToPositionId`
    ),
    hierarchicalLevel: requireEnum(
      row.hierarchicalLevel,
      POSITION_HIERARCHICAL_LEVELS,
      `positions[${index}].hierarchicalLevel`
    ),
    status: requireEnum(
      row.status,
      POSITION_STATUSES,
      `positions[${index}].status`
    ),
    weeklyWorkloadHours: requireNumber(
      row.weeklyWorkloadHours,
      `positions[${index}].weeklyWorkloadHours`
    ),
    workModel: requireEnum(
      row.workModel,
      POSITION_WORK_MODELS,
      `positions[${index}].workModel`
    ),
    employmentType: requireEnum(
      row.employmentType,
      POSITION_EMPLOYMENT_TYPES,
      `positions[${index}].employmentType`
    ),
    travelRequirement: requireEnum(
      row.travelRequirement,
      POSITION_TRAVEL_REQUIREMENTS,
      `positions[${index}].travelRequirement`
    ),
    archivedAt: requireNullableString(
      row.archivedAt,
      `positions[${index}].archivedAt`
    ),
  })
}

function parseEmployee(
  value: unknown,
  index: number
): SnapshotEmployee {
  const row = requireObject(
    value,
    `employees[${index}]`
  )

  const discProfile =
    row.discProfile === null
      ? null
      : requireEnum(
          row.discProfile,
          EMPLOYEE_DISC_PROFILES,
          `employees[${index}].discProfile`
        )

  return Object.freeze({
    id: requireString(
      row.id,
      `employees[${index}].id`
    ),
    userId: requireNullableString(
      row.userId,
      `employees[${index}].userId`
    ),
    fullName: requireString(
      row.fullName,
      `employees[${index}].fullName`
    ),
    email: requireNullableString(
      row.email,
      `employees[${index}].email`
    ),
    phone: requireNullableString(
      row.phone,
      `employees[${index}].phone`
    ),
    birthDate: requireNullableString(
      row.birthDate,
      `employees[${index}].birthDate`
    ),
    hireDate: requireNullableString(
      row.hireDate,
      `employees[${index}].hireDate`
    ),
    status: requireEnum(
      row.status,
      EMPLOYEE_STATUSES,
      `employees[${index}].status`
    ),
    departmentId: requireNullableString(
      row.departmentId,
      `employees[${index}].departmentId`
    ),
    teamId: requireNullableString(
      row.teamId,
      `employees[${index}].teamId`
    ),
    positionId: requireNullableString(
      row.positionId,
      `employees[${index}].positionId`
    ),
    managerEmployeeId: requireNullableString(
      row.managerEmployeeId,
      `employees[${index}].managerEmployeeId`
    ),
    discProfile,
    avatarUrl: requireNullableString(
      row.avatarUrl,
      `employees[${index}].avatarUrl`
    ),
    archivedAt: requireNullableString(
      row.archivedAt,
      `employees[${index}].archivedAt`
    ),
  })
}

export function parseOrganizationSnapshot(
  value: unknown
): OrganizationSnapshot {
  const snapshot = requireObject(
    value,
    "organizationData"
  )

  if (
    snapshot.schemaVersion !==
    ORGANIZATION_SNAPSHOT_SCHEMA_VERSION
  ) {
    throw new Error(
      `Versão de snapshot organizacional não suportada: ${String(
        snapshot.schemaVersion
      )}.`
    )
  }

  const departments = Object.freeze(
    requireArray(
      snapshot.departments,
      "departments"
    ).map(parseDepartment)
  )

  const teams = Object.freeze(
    requireArray(
      snapshot.teams,
      "teams"
    ).map(parseTeam)
  )

  const positions = Object.freeze(
    requireArray(
      snapshot.positions,
      "positions"
    ).map(parsePosition)
  )

  const employees = Object.freeze(
    requireArray(
      snapshot.employees,
      "employees"
    ).map(parseEmployee)
  )

  return Object.freeze({
    schemaVersion:
      ORGANIZATION_SNAPSHOT_SCHEMA_VERSION,
    generatedAt: requireString(
      snapshot.generatedAt,
      "generatedAt"
    ),
    departments,
    teams,
    positions,
    employees,
  })
}

export function serializeOrganizationSnapshot(
  snapshot: OrganizationSnapshot
): OrganizationSnapshot {
  return parseOrganizationSnapshot(snapshot)
}
