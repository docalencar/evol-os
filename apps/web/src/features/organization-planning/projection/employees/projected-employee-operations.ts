import type {
  ProjectedEmployee,
  ProjectedPosition,
  ProjectionIssue,
} from "../contracts"
import type {
  EmployeeCreatePayload,
  EmployeeTransferPayload,
  EmployeeUpdatePayload,
} from "./employee-change-set"

// O modelo projetado de colaborador é enxuto (`{ id, positionId }`) e não possui
// status. Por isso as operações de employee cobrem create/update/transfer; o
// arquivamento (terminate) depende de extensão de contrato e está adiado.
// Também não há eventos `employee.*` na união de eventos: a execução é registrada
// pelo evento genérico `change-set.executed` do pipeline.
export type EmployeeMutationResult =
  | Readonly<{
      success: true
      employees: readonly ProjectedEmployee[]
      warning?: ProjectionIssue
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

export function createProjectedEmployee(
  employees: readonly ProjectedEmployee[],
  positions: readonly ProjectedPosition[],
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

  const positionValidation = validatePosition(
    positions,
    payload.positionId,
    changeSetId,
    "employee.create"
  )

  if (!positionValidation.success) {
    return positionValidation
  }

  const employee: ProjectedEmployee = Object.freeze({
    id: payload.employeeId,
    positionId: payload.positionId,
  })

  return success([...employees, employee])
}

export function updateProjectedEmployee(
  employees: readonly ProjectedEmployee[],
  positions: readonly ProjectedPosition[],
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

  if (payload.positionId === undefined) {
    return failure(
      "employee.update.empty_patch",
      `O change set ${changeSetId} não possui campos para atualização.`,
      changeSetId
    )
  }

  const positionValidation = validatePosition(
    positions,
    payload.positionId,
    changeSetId,
    "employee.update"
  )

  if (!positionValidation.success) {
    return positionValidation
  }

  if (currentEmployee.positionId === payload.positionId) {
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

  const nextEmployee: ProjectedEmployee = Object.freeze({
    ...currentEmployee,
    positionId: payload.positionId,
  })

  return success(
    employees.map((employee) =>
      employee.id === currentEmployee.id
        ? nextEmployee
        : employee
    )
  )
}

export function transferProjectedEmployee(
  employees: readonly ProjectedEmployee[],
  positions: readonly ProjectedPosition[],
  changeSetId: string,
  payload: EmployeeTransferPayload
): EmployeeMutationResult {
  const currentEmployee = findEmployeeById(
    employees,
    payload.employeeId
  )

  if (!currentEmployee) {
    return failure(
      "employee.transfer.not_found",
      `O colaborador ${payload.employeeId} não foi encontrado.`,
      changeSetId
    )
  }

  const positionValidation = validatePosition(
    positions,
    payload.positionId,
    changeSetId,
    "employee.transfer"
  )

  if (!positionValidation.success) {
    return positionValidation
  }

  if (currentEmployee.positionId === payload.positionId) {
    return Object.freeze({
      success: true,
      employees,
      warning: Object.freeze({
        code: "employee.transfer.no_changes",
        message: `A transferência do colaborador ${currentEmployee.id} não produz alterações.`,
        changeSetId,
      }),
    })
  }

  const transferredEmployee: ProjectedEmployee =
    Object.freeze({
      ...currentEmployee,
      positionId: payload.positionId,
    })

  return success(
    employees.map((employee) =>
      employee.id === currentEmployee.id
        ? transferredEmployee
        : employee
    )
  )
}

function validatePosition(
  positions: readonly ProjectedPosition[],
  positionId: string | null,
  changeSetId: string,
  operation:
    | "employee.create"
    | "employee.update"
    | "employee.transfer"
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

  return Object.freeze({
    success: true,
  })
}

function findEmployeeById(
  employees: readonly ProjectedEmployee[],
  employeeId: string
): ProjectedEmployee | undefined {
  return employees.find(
    (employee) => employee.id === employeeId
  )
}

function success(
  employees: readonly ProjectedEmployee[]
): EmployeeMutationResult {
  return Object.freeze({
    success: true,
    employees: Object.freeze(
      employees.map((employee) =>
        Object.isFrozen(employee)
          ? employee
          : Object.freeze({ ...employee })
      )
    ),
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
