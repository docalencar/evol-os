import type {
  ProjectedDepartment,
  ProjectedEmployee,
  ProjectedPosition,
  ProjectedTeam,
  ProjectionIssue,
} from "../contracts"
import type {
  EmployeeCreatePayload,
  EmployeeTerminatePayload,
  EmployeeTransferPayload,
  EmployeeUpdatePayload,
} from "./employee-change-set"

export type EmployeeMutationResult =
  | Readonly<{ success: true; employees: readonly ProjectedEmployee[]; warning?: ProjectionIssue }>
  | Readonly<{ success: false; issue: ProjectionIssue }>

type OrganizationReferences = Readonly<{
  departments: readonly ProjectedDepartment[]
  teams: readonly ProjectedTeam[]
  positions: readonly ProjectedPosition[]
}>

export function createProjectedEmployee(
  employees: readonly ProjectedEmployee[],
  references: OrganizationReferences,
  changeSetId: string,
  payload: EmployeeCreatePayload
): EmployeeMutationResult {
  if (findEmployee(employees, payload.employeeId)) {
    return failure("employee.create.id_already_exists", `Já existe um colaborador com o identificador ${payload.employeeId}.`, changeSetId)
  }

  const placement = resolvePlacement(references, payload, changeSetId, "employee.create")
  if (!placement.success) return placement

  return success([...employees, Object.freeze({
    id: payload.employeeId,
    ...placement.value,
    status: "active" as const,
  })])
}

export function updateProjectedEmployee(
  employees: readonly ProjectedEmployee[],
  references: OrganizationReferences,
  changeSetId: string,
  payload: EmployeeUpdatePayload
): EmployeeMutationResult {
  return changePlacement(employees, references, changeSetId, payload, "employee.update")
}

export function transferProjectedEmployee(
  employees: readonly ProjectedEmployee[],
  references: OrganizationReferences,
  changeSetId: string,
  payload: EmployeeTransferPayload
): EmployeeMutationResult {
  return changePlacement(employees, references, changeSetId, payload, "employee.transfer")
}

export function terminateProjectedEmployee(
  employees: readonly ProjectedEmployee[],
  changeSetId: string,
  payload: EmployeeTerminatePayload
): EmployeeMutationResult {
  const current = findEmployee(employees, payload.employeeId)
  if (!current) return failure("employee.terminate.not_found", `O colaborador ${payload.employeeId} não foi encontrado.`, changeSetId)
  if (current.status === "archived") {
    return Object.freeze({ success: true, employees, warning: Object.freeze({
      code: "employee.terminate.already_archived",
      message: `O colaborador ${current.id} já está arquivado.`,
      changeSetId,
    }) })
  }

  return replace(employees, current.id, Object.freeze({ ...current, status: "archived" as const }))
}

function changePlacement(
  employees: readonly ProjectedEmployee[],
  references: OrganizationReferences,
  changeSetId: string,
  payload: EmployeeUpdatePayload | EmployeeTransferPayload,
  operation: "employee.update" | "employee.transfer"
): EmployeeMutationResult {
  const current = findEmployee(employees, payload.employeeId)
  if (!current) return failure(`${operation}.not_found`, `O colaborador ${payload.employeeId} não foi encontrado.`, changeSetId)
  if (current.status === "archived") return failure(`${operation}.archived`, `O colaborador ${payload.employeeId} está arquivado.`, changeSetId)

  const requested: {
    positionId?: string | null
    departmentId?: string | null
    teamId?: string | null
  } = {
    positionId: own(payload, "positionId") ? payload.positionId : current.positionId,
    teamId: own(payload, "teamId") ? payload.teamId : current.teamId,
  }
  if (own(payload, "departmentId")) {
    requested.departmentId = payload.departmentId
  } else if (!own(payload, "positionId") && !own(payload, "teamId")) {
    requested.departmentId = current.departmentId
  }

  const placement = resolvePlacement(references, requested, changeSetId, operation)
  if (!placement.success) return placement

  const next = Object.freeze({ ...current, ...placement.value, status: "active" as const })
  if (samePlacement(current, next)) {
    return Object.freeze({ success: true, employees, warning: Object.freeze({
      code: `${operation}.no_changes`,
      message: `A movimentação do colaborador ${current.id} não produz alterações.`,
      changeSetId,
    }) })
  }
  return replace(employees, current.id, next)
}

function resolvePlacement(
  references: OrganizationReferences,
  requested: Readonly<{ positionId?: string | null; departmentId?: string | null; teamId?: string | null }>,
  changeSetId: string,
  operation: "employee.create" | "employee.update" | "employee.transfer"
): Readonly<{ success: true; value: { positionId: string | null; departmentId: string | null; teamId: string | null } }> | Readonly<{ success: false; issue: ProjectionIssue }> {
  const positionId = requested.positionId ?? null
  const teamId = requested.teamId ?? null
  const position = positionId === null ? undefined : references.positions.find((item) => item.id === positionId)
  const team = teamId === null ? undefined : references.teams.find((item) => item.id === teamId)

  if (positionId !== null && (!position || position.status === "archived")) {
    return failure(`${operation}.position_${position ? "archived" : "not_found"}`, `O cargo ${positionId} não está disponível.`, changeSetId)
  }
  if (teamId !== null && (!team || team.status === "archived")) {
    return failure(`${operation}.team_${team ? "archived" : "not_found"}`, `O time ${teamId} não está disponível.`, changeSetId)
  }

  const departmentId = requested.departmentId !== undefined
    ? requested.departmentId
    : position?.departmentId ?? team?.departmentId ?? null
  const department = departmentId === null ? undefined : references.departments.find((item) => item.id === departmentId)
  if (departmentId !== null && (!department || department.status === "archived")) {
    return failure(`${operation}.department_${department ? "archived" : "not_found"}`, `O departamento ${departmentId} não está disponível.`, changeSetId)
  }
  if (position && position.departmentId !== departmentId) {
    return failure(`${operation}.position_department_mismatch`, `O cargo ${position.id} não pertence ao departamento ${departmentId}.`, changeSetId)
  }
  if (team && team.departmentId !== departmentId) {
    return failure(`${operation}.team_department_mismatch`, `O time ${team.id} não pertence ao departamento ${departmentId}.`, changeSetId)
  }

  return Object.freeze({ success: true, value: Object.freeze({ positionId, departmentId, teamId }) })
}

function samePlacement(left: ProjectedEmployee, right: ProjectedEmployee) {
  return left.positionId === right.positionId &&
    (left.departmentId ?? null) === (right.departmentId ?? null) &&
    (left.teamId ?? null) === (right.teamId ?? null)
}

function findEmployee(employees: readonly ProjectedEmployee[], employeeId: string) {
  return employees.find((employee) => employee.id === employeeId)
}

function replace(employees: readonly ProjectedEmployee[], employeeId: string, next: ProjectedEmployee) {
  return success(employees.map((employee) => employee.id === employeeId ? next : employee))
}

function success(employees: readonly ProjectedEmployee[]): EmployeeMutationResult {
  return Object.freeze({ success: true, employees: Object.freeze([...employees]) })
}

function failure(code: string, message: string, changeSetId: string): Readonly<{ success: false; issue: ProjectionIssue }> {
  return Object.freeze({ success: false, issue: Object.freeze({ code, message, changeSetId }) })
}

function own(value: object, property: string) {
  return Object.prototype.hasOwnProperty.call(value, property)
}
