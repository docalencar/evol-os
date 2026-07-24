import type {
  EmployeeMutableField,
  ProjectedDepartment,
  ProjectedEmployee,
  ProjectedPosition,
  ProjectedTeam,
  ProjectionInternalEvent,
  ProjectionIssue,
} from "../contracts"
import type {
  EmployeeArchivePayload,
  EmployeeCreatePayload,
  EmployeeMovePayload,
  EmployeeUpdatePayload,
} from "./employee-change-set"

export type EmployeeMutationResult =
  | Readonly<{
      success: true
      employees: readonly ProjectedEmployee[]
      event?: ProjectionInternalEvent
      warning?: ProjectionIssue
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

type EmployeeStructuralReferences = Readonly<{
  departments: readonly ProjectedDepartment[]
  teams: readonly ProjectedTeam[]
  positions: readonly ProjectedPosition[]
}>

export function createProjectedEmployee(
  employees: readonly ProjectedEmployee[],
  references: EmployeeStructuralReferences,
  changeSetId: string,
  payload: EmployeeCreatePayload
): EmployeeMutationResult {
  if (findEmployeeById(employees, payload.employeeId)) {
    return failure(
      "employee.create.id_already_exists",
      `Já existe um colaborador com o identificador ${payload.employeeId}.`,
      changeSetId
    )
  }

  if (
    payload.email !== null &&
    findEmployeeByEmail(employees, payload.email)
  ) {
    return failure(
      "employee.create.email_already_exists",
      `Já existe um colaborador com o e-mail ${payload.email}.`,
      changeSetId
    )
  }

  const managerValidation = validateManager(
    employees,
    payload.managerId,
    payload.employeeId,
    changeSetId,
    "employee.create"
  )

  if (!managerValidation.success) {
    return managerValidation
  }

  const allocationValidation =
    validateEmployeeAllocation(
      references,
      payload.departmentId,
      payload.teamId,
      payload.positionId,
      changeSetId,
      "employee.create"
    )

  if (!allocationValidation.success) {
    return allocationValidation
  }

  const employee: ProjectedEmployee = Object.freeze({
    id: payload.employeeId,
    fullName: normalizeRequiredText(
      payload.fullName
    ),
    email: normalizeNullableEmail(payload.email),
    status: payload.status,
    managerId: payload.managerId,
    departmentId: payload.departmentId,
    teamId: payload.teamId,
    positionId: payload.positionId,
  })

  return success(
    [...employees, employee],
    Object.freeze({
      type: "employee.created",
      changeSetId,
      employeeId: employee.id,
    })
  )
}

export function updateProjectedEmployee(
  employees: readonly ProjectedEmployee[],
  changeSetId: string,
  payload: EmployeeUpdatePayload
): EmployeeMutationResult {
  const currentEmployee = findEmployeeById(
    employees,
    payload.employeeId
  )

  if (!currentEmployee) {
    return failure(
      "employee.update.not_found",
      `O colaborador ${payload.employeeId} não foi encontrado.`,
      changeSetId
    )
  }

  if (currentEmployee.status === "terminated") {
    return failure(
      "employee.update.terminated",
      `O colaborador ${payload.employeeId} está desligado e não pode ser atualizado.`,
      changeSetId
    )
  }

  if (!hasUpdateFields(payload)) {
    return failure(
      "employee.update.empty_patch",
      `O change set ${changeSetId} não possui campos para atualização.`,
      changeSetId
    )
  }

  const nextEmployee: ProjectedEmployee =
    Object.freeze({
      ...currentEmployee,
      fullName:
        payload.fullName === undefined
          ? currentEmployee.fullName
          : normalizeRequiredText(payload.fullName),
      email:
        payload.email === undefined
          ? currentEmployee.email
          : normalizeNullableEmail(payload.email),
      status:
        payload.status === undefined
          ? currentEmployee.status
          : payload.status,
      managerId:
        payload.managerId === undefined
          ? currentEmployee.managerId
          : payload.managerId,
    })

  if (
    nextEmployee.email !== null &&
    findEmployeeByEmail(
      employees,
      nextEmployee.email,
      currentEmployee.id
    )
  ) {
    return failure(
      "employee.update.email_already_exists",
      `Já existe outro colaborador com o e-mail ${nextEmployee.email}.`,
      changeSetId
    )
  }

  const managerValidation = validateManager(
    employees,
    nextEmployee.managerId,
    currentEmployee.id,
    changeSetId,
    "employee.update"
  )

  if (!managerValidation.success) {
    return managerValidation
  }

  const changedFields = getChangedFields(
    currentEmployee,
    nextEmployee
  )

  if (changedFields.length === 0) {
    return Object.freeze({
      success: true,
      employees,
      warning: Object.freeze({
        code: "employee.update.no_changes",
        message: `A atualização do colaborador ${currentEmployee.id} não produz alterações.`,
        changeSetId,
      }),
    })
  }

  return success(
    employees.map((employee) =>
      employee.id === currentEmployee.id
        ? nextEmployee
        : employee
    ),
    Object.freeze({
      type: "employee.updated",
      changeSetId,
      employeeId: currentEmployee.id,
      changedFields,
    })
  )
}

export function archiveProjectedEmployee(
  employees: readonly ProjectedEmployee[],
  changeSetId: string,
  payload: EmployeeArchivePayload
): EmployeeMutationResult {
  const currentEmployee = findEmployeeById(
    employees,
    payload.employeeId
  )

  if (!currentEmployee) {
    return failure(
      "employee.archive.not_found",
      `O colaborador ${payload.employeeId} não foi encontrado.`,
      changeSetId
    )
  }

  if (currentEmployee.status === "terminated") {
    return Object.freeze({
      success: true,
      employees,
      warning: Object.freeze({
        code: "employee.archive.already_archived",
        message: `O colaborador ${currentEmployee.id} já está desligado.`,
        changeSetId,
      }),
    })
  }

  const activeDirectReport = employees.find(
    (employee) =>
      employee.managerId === currentEmployee.id &&
      employee.status !== "terminated"
  )

  if (activeDirectReport) {
    return failure(
      "employee.archive.has_active_direct_reports",
      `O colaborador ${currentEmployee.id} possui liderados ativos e não pode ser desligado antes da redistribuição da liderança.`,
      changeSetId
    )
  }

  const archivedEmployee: ProjectedEmployee =
    Object.freeze({
      ...currentEmployee,
      status: "terminated",
      managerId: null,
      departmentId: null,
      teamId: null,
      positionId: null,
    })

  return success(
    employees.map((employee) =>
      employee.id === currentEmployee.id
        ? archivedEmployee
        : employee
    ),
    Object.freeze({
      type: "employee.archived",
      changeSetId,
      employeeId: currentEmployee.id,
    })
  )
}

export function moveProjectedEmployee(
  employees: readonly ProjectedEmployee[],
  references: EmployeeStructuralReferences,
  changeSetId: string,
  payload: EmployeeMovePayload
): EmployeeMutationResult {
  const currentEmployee = findEmployeeById(
    employees,
    payload.employeeId
  )

  if (!currentEmployee) {
    return failure(
      "employee.move.not_found",
      `O colaborador ${payload.employeeId} não foi encontrado.`,
      changeSetId
    )
  }

  if (currentEmployee.status === "terminated") {
    return failure(
      "employee.move.terminated",
      `O colaborador ${payload.employeeId} está desligado e não pode ser movimentado.`,
      changeSetId
    )
  }

  const allocationValidation =
    validateEmployeeAllocation(
      references,
      payload.departmentId,
      payload.teamId,
      payload.positionId,
      changeSetId,
      "employee.move"
    )

  if (!allocationValidation.success) {
    return allocationValidation
  }

  if (
    currentEmployee.departmentId ===
      payload.departmentId &&
    currentEmployee.teamId === payload.teamId &&
    currentEmployee.positionId ===
      payload.positionId
  ) {
    return Object.freeze({
      success: true,
      employees,
      warning: Object.freeze({
        code: "employee.move.no_changes",
        message: `A movimentação do colaborador ${currentEmployee.id} não produz alterações.`,
        changeSetId,
      }),
    })
  }

  const movedEmployee: ProjectedEmployee =
    Object.freeze({
      ...currentEmployee,
      departmentId: payload.departmentId,
      teamId: payload.teamId,
      positionId: payload.positionId,
    })

  return success(
    employees.map((employee) =>
      employee.id === currentEmployee.id
        ? movedEmployee
        : employee
    ),
    Object.freeze({
      type: "employee.moved",
      changeSetId,
      employeeId: currentEmployee.id,
      previousDepartmentId:
        currentEmployee.departmentId,
      departmentId: movedEmployee.departmentId,
      previousTeamId: currentEmployee.teamId,
      teamId: movedEmployee.teamId,
      previousPositionId:
        currentEmployee.positionId,
      positionId: movedEmployee.positionId,
    })
  )
}

function validateManager(
  employees: readonly ProjectedEmployee[],
  managerId: string | null,
  employeeId: string,
  changeSetId: string,
  operation: "employee.create" | "employee.update"
): EmployeeMutationResult | Readonly<{ success: true }> {
  if (managerId === null) {
    return Object.freeze({
      success: true,
    })
  }

  if (managerId === employeeId) {
    return failure(
      `${operation}.self_manager`,
      `O colaborador ${employeeId} não pode ser seu próprio gestor.`,
      changeSetId
    )
  }

  const manager = findEmployeeById(
    employees,
    managerId
  )

  if (!manager) {
    return failure(
      `${operation}.manager_not_found`,
      `O gestor ${managerId} não foi encontrado.`,
      changeSetId
    )
  }

  if (manager.status === "terminated") {
    return failure(
      `${operation}.manager_terminated`,
      `O gestor ${managerId} está desligado e não pode receber liderados.`,
      changeSetId
    )
  }

  if (
    operation === "employee.update" &&
    createsManagementCycle(
      employees,
      employeeId,
      managerId
    )
  ) {
    return failure(
      "employee.update.management_cycle",
      `A alteração do gestor do colaborador ${employeeId} cria um ciclo de liderança.`,
      changeSetId
    )
  }

  return Object.freeze({
    success: true,
  })
}

function validateEmployeeAllocation(
  references: EmployeeStructuralReferences,
  departmentId: string | null,
  teamId: string | null,
  positionId: string | null,
  changeSetId: string,
  operation: "employee.create" | "employee.move"
): EmployeeMutationResult | Readonly<{ success: true }> {
  const departmentValidation = validateDepartment(
    references.departments,
    departmentId,
    changeSetId,
    operation
  )

  if (!departmentValidation.success) {
    return departmentValidation
  }

  const teamValidation = validateTeam(
    references.teams,
    teamId,
    departmentId,
    changeSetId,
    operation
  )

  if (!teamValidation.success) {
    return teamValidation
  }

  const positionValidation = validatePosition(
    references.positions,
    positionId,
    departmentId,
    changeSetId,
    operation
  )

  if (!positionValidation.success) {
    return positionValidation
  }

  return Object.freeze({
    success: true,
  })
}

function validateDepartment(
  departments: readonly ProjectedDepartment[],
  departmentId: string | null,
  changeSetId: string,
  operation: "employee.create" | "employee.move"
): EmployeeMutationResult | Readonly<{ success: true }> {
  if (departmentId === null) {
    return Object.freeze({
      success: true,
    })
  }

  const department = departments.find(
    (candidate) => candidate.id === departmentId
  )

  if (!department) {
    return failure(
      `${operation}.department_not_found`,
      `O departamento ${departmentId} não foi encontrado.`,
      changeSetId
    )
  }

  if (department.status === "archived") {
    return failure(
      `${operation}.department_archived`,
      `O departamento ${departmentId} está arquivado e não pode receber colaboradores.`,
      changeSetId
    )
  }

  return Object.freeze({
    success: true,
  })
}

function validateTeam(
  teams: readonly ProjectedTeam[],
  teamId: string | null,
  departmentId: string | null,
  changeSetId: string,
  operation: "employee.create" | "employee.move"
): EmployeeMutationResult | Readonly<{ success: true }> {
  if (teamId === null) {
    return Object.freeze({
      success: true,
    })
  }

  const team = teams.find(
    (candidate) => candidate.id === teamId
  )

  if (!team) {
    return failure(
      `${operation}.team_not_found`,
      `O time ${teamId} não foi encontrado.`,
      changeSetId
    )
  }

  if (team.status === "archived") {
    return failure(
      `${operation}.team_archived`,
      `O time ${teamId} está arquivado e não pode receber colaboradores.`,
      changeSetId
    )
  }

  if (departmentId === null) {
    return failure(
      `${operation}.department_required_for_team`,
      `O colaborador deve possuir um departamento para ser vinculado ao time ${teamId}.`,
      changeSetId
    )
  }

  if (team.departmentId !== departmentId) {
    return failure(
      `${operation}.team_department_mismatch`,
      `O time ${teamId} não pertence ao departamento ${departmentId}.`,
      changeSetId
    )
  }

  return Object.freeze({
    success: true,
  })
}

function validatePosition(
  positions: readonly ProjectedPosition[],
  positionId: string | null,
  departmentId: string | null,
  changeSetId: string,
  operation: "employee.create" | "employee.move"
): EmployeeMutationResult | Readonly<{ success: true }> {
  if (positionId === null) {
    return Object.freeze({
      success: true,
    })
  }

  const position = positions.find(
    (candidate) => candidate.id === positionId
  )

  if (!position) {
    return failure(
      `${operation}.position_not_found`,
      `O cargo ${positionId} não foi encontrado.`,
      changeSetId
    )
  }

  if (position.status === "archived") {
    return failure(
      `${operation}.position_archived`,
      `O cargo ${positionId} está arquivado e não pode receber colaboradores.`,
      changeSetId
    )
  }

  if (
    position.departmentId !== null &&
    departmentId === null
  ) {
    return failure(
      `${operation}.department_required_for_position`,
      `O colaborador deve possuir um departamento para ocupar o cargo ${positionId}.`,
      changeSetId
    )
  }

  if (
    position.departmentId !== null &&
    position.departmentId !== departmentId
  ) {
    return failure(
      `${operation}.position_department_mismatch`,
      `O cargo ${positionId} não pertence ao departamento ${departmentId}.`,
      changeSetId
    )
  }

  return Object.freeze({
    success: true,
  })
}

function createsManagementCycle(
  employees: readonly ProjectedEmployee[],
  employeeId: string,
  managerId: string
): boolean {
  const visited = new Set<string>()
  let currentManagerId: string | null = managerId

  while (currentManagerId !== null) {
    if (currentManagerId === employeeId) {
      return true
    }

    if (visited.has(currentManagerId)) {
      return true
    }

    visited.add(currentManagerId)

    const currentManager = findEmployeeById(
      employees,
      currentManagerId
    )

    if (!currentManager) {
      return false
    }

    currentManagerId = currentManager.managerId
  }

  return false
}

function findEmployeeById(
  employees: readonly ProjectedEmployee[],
  employeeId: string
): ProjectedEmployee | undefined {
  return employees.find(
    (employee) => employee.id === employeeId
  )
}

function findEmployeeByEmail(
  employees: readonly ProjectedEmployee[],
  email: string,
  ignoredEmployeeId?: string
): ProjectedEmployee | undefined {
  const normalizedEmail =
    normalizeComparableText(email)

  return employees.find(
    (employee) =>
      employee.id !== ignoredEmployeeId &&
      employee.email !== null &&
      normalizeComparableText(employee.email) ===
        normalizedEmail
  )
}

function hasUpdateFields(
  payload: EmployeeUpdatePayload
): boolean {
  return (
    payload.fullName !== undefined ||
    payload.email !== undefined ||
    payload.status !== undefined ||
    payload.managerId !== undefined
  )
}

function getChangedFields(
  currentEmployee: ProjectedEmployee,
  nextEmployee: ProjectedEmployee
): readonly EmployeeMutableField[] {
  const changedFields: EmployeeMutableField[] = []

  if (
    currentEmployee.fullName !==
    nextEmployee.fullName
  ) {
    changedFields.push("fullName")
  }

  if (currentEmployee.email !== nextEmployee.email) {
    changedFields.push("email")
  }

  if (
    currentEmployee.status !== nextEmployee.status
  ) {
    changedFields.push("status")
  }

  if (
    currentEmployee.managerId !==
    nextEmployee.managerId
  ) {
    changedFields.push("managerId")
  }

  return Object.freeze(changedFields)
}

function normalizeRequiredText(value: string): string {
  return value.trim()
}

function normalizeNullableEmail(
  value: string | null
): string | null {
  if (value === null) {
    return null
  }

  const normalized = value
    .trim()
    .toLocaleLowerCase("pt-BR")

  return normalized.length > 0 ? normalized : null
}

function normalizeComparableText(
  value: string
): string {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
}

function success(
  employees: readonly ProjectedEmployee[],
  event: ProjectionInternalEvent
): EmployeeMutationResult {
  return Object.freeze({
    success: true,
    employees: Object.freeze(
      employees.map((employee) =>
        Object.isFrozen(employee)
          ? employee
          : Object.freeze({
              ...employee,
            })
      )
    ),
    event,
  })
}

function failure(
  code: string,
  message: string,
  changeSetId: string
): EmployeeMutationResult {
  return Object.freeze({
    success: false,
    issue: Object.freeze({
      code,
      message,
      changeSetId,
    }),
  })
}
