import type {
  PositionMutableField,
  ProjectedDepartment,
  ProjectedEmployee,
  ProjectedPosition,
  ProjectionInternalEvent,
  ProjectionIssue,
} from "../contracts"
import type {
  PositionArchivePayload,
  PositionCreatePayload,
  PositionMovePayload,
  PositionUpdatePayload,
} from "./position-change-set"

export type PositionMutationResult =
  | Readonly<{
      success: true
      positions: readonly ProjectedPosition[]
      event?: ProjectionInternalEvent
      warning?: ProjectionIssue
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

export function createProjectedPosition(
  positions: readonly ProjectedPosition[],
  departments: readonly ProjectedDepartment[],
  changeSetId: string,
  payload: PositionCreatePayload
): PositionMutationResult {
  if (findPositionById(positions, payload.positionId)) {
    return failure(
      "position.create.id_already_exists",
      `Já existe um cargo com o identificador ${payload.positionId}.`,
      changeSetId
    )
  }

  if (findActivePositionByName(positions, payload.name)) {
    return failure(
      "position.create.name_already_exists",
      `Já existe um cargo ativo com o nome ${payload.name}.`,
      changeSetId
    )
  }

  const departmentValidation = validateDepartment(
    departments,
    payload.departmentId,
    changeSetId,
    "position.create"
  )

  if (!departmentValidation.success) {
    return departmentValidation
  }

  const position: ProjectedPosition = Object.freeze({
    id: payload.positionId,
    name: normalizeRequiredText(payload.name),
    description: normalizeNullableText(payload.description),
    departmentId: payload.departmentId,
    hierarchicalLevel: payload.hierarchicalLevel,
    weeklyWorkloadHours: payload.weeklyWorkloadHours,
    workModel: payload.workModel,
    employmentType: payload.employmentType,
    travelRequirement: payload.travelRequirement,
    status: "active",
  })

  return success(
    [...positions, position],
    Object.freeze({
      type: "position.created",
      changeSetId,
      positionId: position.id,
    })
  )
}

export function updateProjectedPosition(
  positions: readonly ProjectedPosition[],
  changeSetId: string,
  payload: PositionUpdatePayload
): PositionMutationResult {
  const currentPosition = findPositionById(
    positions,
    payload.positionId
  )

  if (!currentPosition) {
    return failure(
      "position.update.not_found",
      `O cargo ${payload.positionId} não foi encontrado.`,
      changeSetId
    )
  }

  if (currentPosition.status === "archived") {
    return failure(
      "position.update.archived",
      `O cargo ${payload.positionId} está arquivado e não pode ser atualizado.`,
      changeSetId
    )
  }

  if (!hasUpdateFields(payload)) {
    return failure(
      "position.update.empty_patch",
      `O change set ${changeSetId} não possui campos para atualização.`,
      changeSetId
    )
  }

  const nextPosition: ProjectedPosition = Object.freeze({
    ...currentPosition,
    name:
      payload.name === undefined
        ? currentPosition.name
        : normalizeRequiredText(payload.name),
    description:
      payload.description === undefined
        ? currentPosition.description
        : normalizeNullableText(payload.description),
    hierarchicalLevel:
      payload.hierarchicalLevel === undefined
        ? currentPosition.hierarchicalLevel
        : payload.hierarchicalLevel,
    weeklyWorkloadHours:
      payload.weeklyWorkloadHours === undefined
        ? currentPosition.weeklyWorkloadHours
        : payload.weeklyWorkloadHours,
    workModel:
      payload.workModel === undefined
        ? currentPosition.workModel
        : payload.workModel,
    employmentType:
      payload.employmentType === undefined
        ? currentPosition.employmentType
        : payload.employmentType,
    travelRequirement:
      payload.travelRequirement === undefined
        ? currentPosition.travelRequirement
        : payload.travelRequirement,
  })

  const duplicateName = findActivePositionByName(
    positions,
    nextPosition.name,
    currentPosition.id
  )

  if (duplicateName) {
    return failure(
      "position.update.name_already_exists",
      `Já existe outro cargo ativo com o nome ${nextPosition.name}.`,
      changeSetId
    )
  }

  const changedFields = getChangedFields(
    currentPosition,
    nextPosition
  )

  if (changedFields.length === 0) {
    return Object.freeze({
      success: true,
      positions,
      warning: Object.freeze({
        code: "position.update.no_changes",
        message: `A atualização do cargo ${currentPosition.id} não produz alterações.`,
        changeSetId,
      }),
    })
  }

  return success(
    positions.map((position) =>
      position.id === currentPosition.id
        ? nextPosition
        : position
    ),
    Object.freeze({
      type: "position.updated",
      changeSetId,
      positionId: currentPosition.id,
      changedFields,
    })
  )
}

export function archiveProjectedPosition(
  positions: readonly ProjectedPosition[],
  employees: readonly ProjectedEmployee[],
  changeSetId: string,
  payload: PositionArchivePayload
): PositionMutationResult {
  const currentPosition = findPositionById(
    positions,
    payload.positionId
  )

  if (!currentPosition) {
    return failure(
      "position.archive.not_found",
      `O cargo ${payload.positionId} não foi encontrado.`,
      changeSetId
    )
  }

  if (currentPosition.status === "archived") {
    return Object.freeze({
      success: true,
      positions,
      warning: Object.freeze({
        code: "position.archive.already_archived",
        message: `O cargo ${currentPosition.id} já está arquivado.`,
        changeSetId,
      }),
    })
  }

  const referencingEmployees = employees
    .filter(
      (employee) =>
        employee.positionId === currentPosition.id
    )
    .map((employee) => employee.id)
    .sort((left, right) => left.localeCompare(right))

  if (referencingEmployees.length > 0) {
    return failure(
      "position.archive.has_active_employees",
      `O cargo ${currentPosition.id} possui colaboradores ativos vinculados: ${referencingEmployees.join(", ")}.`,
      changeSetId
    )
  }

  const archivedPosition: ProjectedPosition =
    Object.freeze({
      ...currentPosition,
      status: "archived",
    })

  return success(
    positions.map((position) =>
      position.id === currentPosition.id
        ? archivedPosition
        : position
    ),
    Object.freeze({
      type: "position.archived",
      changeSetId,
      positionId: currentPosition.id,
    })
  )
}

export function moveProjectedPosition(
  positions: readonly ProjectedPosition[],
  departments: readonly ProjectedDepartment[],
  changeSetId: string,
  payload: PositionMovePayload
): PositionMutationResult {
  const currentPosition = findPositionById(
    positions,
    payload.positionId
  )

  if (!currentPosition) {
    return failure(
      "position.move.not_found",
      `O cargo ${payload.positionId} não foi encontrado.`,
      changeSetId
    )
  }

  if (currentPosition.status === "archived") {
    return failure(
      "position.move.archived",
      `O cargo ${payload.positionId} está arquivado e não pode ser movimentado.`,
      changeSetId
    )
  }

  const departmentValidation = validateDepartment(
    departments,
    payload.departmentId,
    changeSetId,
    "position.move"
  )

  if (!departmentValidation.success) {
    return departmentValidation
  }

  if (currentPosition.departmentId === payload.departmentId) {
    return Object.freeze({
      success: true,
      positions,
      warning: Object.freeze({
        code: "position.move.no_changes",
        message: `A movimentação do cargo ${currentPosition.id} não produz alterações.`,
        changeSetId,
      }),
    })
  }

  const movedPosition: ProjectedPosition = Object.freeze({
    ...currentPosition,
    departmentId: payload.departmentId,
  })

  return success(
    positions.map((position) =>
      position.id === currentPosition.id
        ? movedPosition
        : position
    ),
    Object.freeze({
      type: "position.moved",
      changeSetId,
      positionId: currentPosition.id,
      previousDepartmentId: currentPosition.departmentId,
      departmentId: movedPosition.departmentId,
    })
  )
}

function validateDepartment(
  departments: readonly ProjectedDepartment[],
  departmentId: string | null,
  changeSetId: string,
  operation: "position.create" | "position.move"
): PositionMutationResult | Readonly<{ success: true }> {
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
      `O departamento ${departmentId} está arquivado e não pode receber cargos.`,
      changeSetId
    )
  }

  return Object.freeze({
    success: true,
  })
}

function findPositionById(
  positions: readonly ProjectedPosition[],
  positionId: string
): ProjectedPosition | undefined {
  return positions.find(
    (position) => position.id === positionId
  )
}

function findActivePositionByName(
  positions: readonly ProjectedPosition[],
  name: string,
  ignoredPositionId?: string
): ProjectedPosition | undefined {
  const normalizedName = normalizeComparableText(name)

  return positions.find(
    (position) =>
      position.id !== ignoredPositionId &&
      position.status === "active" &&
      normalizeComparableText(position.name) ===
        normalizedName
  )
}

function hasUpdateFields(
  payload: PositionUpdatePayload
): boolean {
  return (
    payload.name !== undefined ||
    payload.description !== undefined ||
    payload.hierarchicalLevel !== undefined ||
    payload.weeklyWorkloadHours !== undefined ||
    payload.workModel !== undefined ||
    payload.employmentType !== undefined ||
    payload.travelRequirement !== undefined
  )
}

function getChangedFields(
  currentPosition: ProjectedPosition,
  nextPosition: ProjectedPosition
): readonly PositionMutableField[] {
  const changedFields: PositionMutableField[] = []

  if (currentPosition.name !== nextPosition.name) {
    changedFields.push("name")
  }

  if (
    currentPosition.description !==
    nextPosition.description
  ) {
    changedFields.push("description")
  }

  if (
    currentPosition.hierarchicalLevel !==
    nextPosition.hierarchicalLevel
  ) {
    changedFields.push("hierarchicalLevel")
  }

  if (
    currentPosition.weeklyWorkloadHours !==
    nextPosition.weeklyWorkloadHours
  ) {
    changedFields.push("weeklyWorkloadHours")
  }

  if (
    currentPosition.workModel !== nextPosition.workModel
  ) {
    changedFields.push("workModel")
  }

  if (
    currentPosition.employmentType !==
    nextPosition.employmentType
  ) {
    changedFields.push("employmentType")
  }

  if (
    currentPosition.travelRequirement !==
    nextPosition.travelRequirement
  ) {
    changedFields.push("travelRequirement")
  }

  return Object.freeze(changedFields)
}

function normalizeRequiredText(value: string): string {
  return value.trim()
}

function normalizeNullableText(
  value: string | null
): string | null {
  if (value === null) {
    return null
  }

  const normalized = value.trim()

  return normalized.length > 0 ? normalized : null
}

function normalizeComparableText(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR")
}

function success(
  positions: readonly ProjectedPosition[],
  event: ProjectionInternalEvent
): PositionMutationResult {
  return Object.freeze({
    success: true,
    positions: Object.freeze(
      positions.map((position) =>
        Object.isFrozen(position)
          ? position
          : Object.freeze({ ...position })
      )
    ),
    event,
  })
}

function failure(
  code: string,
  message: string,
  changeSetId: string
): PositionMutationResult {
  return Object.freeze({
    success: false,
    issue: Object.freeze({
      code,
      message,
      changeSetId,
    }),
  })
}
