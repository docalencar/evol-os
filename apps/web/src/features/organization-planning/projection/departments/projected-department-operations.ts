import type {
  DepartmentMutableField,
  ProjectedDepartment,
  ProjectionInternalEvent,
  ProjectionIssue,
} from "../contracts"
import type {
  DepartmentArchivePayload,
  DepartmentCreatePayload,
  DepartmentUpdatePayload,
} from "./department-change-set"

export type DepartmentMutationResult =
  | Readonly<{
      success: true
      departments: readonly ProjectedDepartment[]
      event?: ProjectionInternalEvent
      warning?: ProjectionIssue
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

export function createProjectedDepartment(
  departments: readonly ProjectedDepartment[],
  changeSetId: string,
  payload: DepartmentCreatePayload
): DepartmentMutationResult {
  if (findDepartmentById(departments, payload.departmentId)) {
    return failure(
      "department.create.id_already_exists",
      `Já existe um departamento com o identificador ${payload.departmentId}.`,
      changeSetId
    )
  }

  if (
    findActiveDepartmentByName(
      departments,
      payload.name
    )
  ) {
    return failure(
      "department.create.name_already_exists",
      `Já existe um departamento ativo com o nome ${payload.name}.`,
      changeSetId
    )
  }

  if (
    payload.code !== null &&
    findActiveDepartmentByCode(departments, payload.code)
  ) {
    return failure(
      "department.create.code_already_exists",
      `Já existe um departamento ativo com o código ${payload.code}.`,
      changeSetId
    )
  }

  const parentValidation = validateParentDepartment(
    departments,
    payload.departmentId,
    payload.parentDepartmentId,
    changeSetId,
    "department.create"
  )

  if (!parentValidation.success) {
    return parentValidation
  }

  const department: ProjectedDepartment = Object.freeze({
    id: payload.departmentId,
    name: normalizeRequiredText(payload.name),
    code: normalizeNullableText(payload.code),
    description: normalizeNullableText(payload.description),
    parentDepartmentId: payload.parentDepartmentId,
    status: "active",
  })

  return success(
    [...departments, department],
    Object.freeze({
      type: "department.created",
      changeSetId,
      departmentId: department.id,
    })
  )
}

export function updateProjectedDepartment(
  departments: readonly ProjectedDepartment[],
  changeSetId: string,
  payload: DepartmentUpdatePayload
): DepartmentMutationResult {
  const currentDepartment = findDepartmentById(
    departments,
    payload.departmentId
  )

  if (!currentDepartment) {
    return failure(
      "department.update.not_found",
      `O departamento ${payload.departmentId} não foi encontrado.`,
      changeSetId
    )
  }

  if (currentDepartment.status === "archived") {
    return failure(
      "department.update.archived",
      `O departamento ${payload.departmentId} está arquivado e não pode ser atualizado.`,
      changeSetId
    )
  }

  if (!hasUpdateFields(payload)) {
    return failure(
      "department.update.empty_patch",
      `O change set ${changeSetId} não possui campos para atualização.`,
      changeSetId
    )
  }

  const nextDepartment: ProjectedDepartment = Object.freeze({
    ...currentDepartment,
    name:
      payload.name === undefined
        ? currentDepartment.name
        : normalizeRequiredText(payload.name),
    code:
      payload.code === undefined
        ? currentDepartment.code
        : normalizeNullableText(payload.code),
    description:
      payload.description === undefined
        ? currentDepartment.description
        : normalizeNullableText(payload.description),
    parentDepartmentId:
      payload.parentDepartmentId === undefined
        ? currentDepartment.parentDepartmentId
        : payload.parentDepartmentId,
  })

  const duplicateName = findActiveDepartmentByName(
    departments,
    nextDepartment.name,
    currentDepartment.id
  )

  if (duplicateName) {
    return failure(
      "department.update.name_already_exists",
      `Já existe outro departamento ativo com o nome ${nextDepartment.name}.`,
      changeSetId
    )
  }

  if (
    nextDepartment.code !== null &&
    findActiveDepartmentByCode(
      departments,
      nextDepartment.code,
      currentDepartment.id
    )
  ) {
    return failure(
      "department.update.code_already_exists",
      `Já existe outro departamento ativo com o código ${nextDepartment.code}.`,
      changeSetId
    )
  }

  const parentValidation = validateParentDepartment(
    departments,
    currentDepartment.id,
    nextDepartment.parentDepartmentId,
    changeSetId,
    "department.update"
  )

  if (!parentValidation.success) {
    return parentValidation
  }

  if (
    createsDepartmentHierarchyCycle(
      departments,
      currentDepartment.id,
      nextDepartment.parentDepartmentId
    )
  ) {
    return failure(
      "department.update.hierarchy_cycle",
      `A alteração criaria um ciclo na hierarquia do departamento ${currentDepartment.id}.`,
      changeSetId
    )
  }

  const changedFields = getChangedFields(
    currentDepartment,
    nextDepartment
  )

  if (changedFields.length === 0) {
    return Object.freeze({
      success: true,
      departments,
      warning: Object.freeze({
        code: "department.update.no_changes",
        message: `A atualização do departamento ${currentDepartment.id} não produz alterações.`,
        changeSetId,
      }),
    })
  }

  return success(
    departments.map((department) =>
      department.id === currentDepartment.id
        ? nextDepartment
        : department
    ),
    Object.freeze({
      type: "department.updated",
      changeSetId,
      departmentId: currentDepartment.id,
      changedFields,
    })
  )
}

export function archiveProjectedDepartment(
  departments: readonly ProjectedDepartment[],
  changeSetId: string,
  payload: DepartmentArchivePayload
): DepartmentMutationResult {
  const currentDepartment = findDepartmentById(
    departments,
    payload.departmentId
  )

  if (!currentDepartment) {
    return failure(
      "department.archive.not_found",
      `O departamento ${payload.departmentId} não foi encontrado.`,
      changeSetId
    )
  }

  if (currentDepartment.status === "archived") {
    return Object.freeze({
      success: true,
      departments,
      warning: Object.freeze({
        code: "department.archive.already_archived",
        message: `O departamento ${currentDepartment.id} já está arquivado.`,
        changeSetId,
      }),
    })
  }

  const activeChildren = departments
    .filter(
      (department) =>
        department.status === "active" &&
        department.parentDepartmentId === currentDepartment.id
    )
    .map((department) => department.id)
    .sort((left, right) => left.localeCompare(right))

  if (activeChildren.length > 0) {
    return failure(
      "department.archive.has_active_children",
      `O departamento ${currentDepartment.id} possui departamentos filhos ativos: ${activeChildren.join(", ")}.`,
      changeSetId
    )
  }

  const archivedDepartment: ProjectedDepartment = Object.freeze({
    ...currentDepartment,
    status: "archived",
  })

  return success(
    departments.map((department) =>
      department.id === currentDepartment.id
        ? archivedDepartment
        : department
    ),
    Object.freeze({
      type: "department.archived",
      changeSetId,
      departmentId: currentDepartment.id,
    })
  )
}

export function findDepartmentById(
  departments: readonly ProjectedDepartment[],
  departmentId: string
): ProjectedDepartment | undefined {
  return departments.find(
    (department) => department.id === departmentId
  )
}

export function createsDepartmentHierarchyCycle(
  departments: readonly ProjectedDepartment[],
  departmentId: string,
  parentDepartmentId: string | null
): boolean {
  let currentParentId = parentDepartmentId
  const visited = new Set<string>()

  while (currentParentId !== null) {
    if (currentParentId === departmentId) {
      return true
    }

    if (visited.has(currentParentId)) {
      return true
    }

    visited.add(currentParentId)

    const parent = findDepartmentById(
      departments,
      currentParentId
    )

    if (!parent) {
      return false
    }

    currentParentId = parent.parentDepartmentId
  }

  return false
}

function validateParentDepartment(
  departments: readonly ProjectedDepartment[],
  departmentId: string,
  parentDepartmentId: string | null,
  changeSetId: string,
  operation: "department.create" | "department.update"
): DepartmentMutationResult | Readonly<{ success: true }> {
  if (parentDepartmentId === null) {
    return Object.freeze({ success: true })
  }

  if (parentDepartmentId === departmentId) {
    return failure(
      `${operation}.self_parent`,
      `O departamento ${departmentId} não pode ser pai de si mesmo.`,
      changeSetId
    )
  }

  const parentDepartment = findDepartmentById(
    departments,
    parentDepartmentId
  )

  if (!parentDepartment) {
    return failure(
      `${operation}.parent_not_found`,
      `O departamento pai ${parentDepartmentId} não foi encontrado.`,
      changeSetId
    )
  }

  if (parentDepartment.status === "archived") {
    return failure(
      `${operation}.parent_archived`,
      `O departamento pai ${parentDepartmentId} está arquivado.`,
      changeSetId
    )
  }

  return Object.freeze({ success: true })
}

function findActiveDepartmentByName(
  departments: readonly ProjectedDepartment[],
  name: string,
  excludedDepartmentId?: string
): ProjectedDepartment | undefined {
  const comparableName = normalizeComparableText(name)

  return departments.find(
    (department) =>
      department.status === "active" &&
      department.id !== excludedDepartmentId &&
      normalizeComparableText(department.name) === comparableName
  )
}

function findActiveDepartmentByCode(
  departments: readonly ProjectedDepartment[],
  code: string,
  excludedDepartmentId?: string
): ProjectedDepartment | undefined {
  const comparableCode = normalizeComparableText(code)

  return departments.find(
    (department) =>
      department.status === "active" &&
      department.id !== excludedDepartmentId &&
      department.code !== null &&
      normalizeComparableText(department.code) === comparableCode
  )
}

function getChangedFields(
  currentDepartment: ProjectedDepartment,
  nextDepartment: ProjectedDepartment
): readonly DepartmentMutableField[] {
  const changedFields: DepartmentMutableField[] = []

  if (currentDepartment.name !== nextDepartment.name) {
    changedFields.push("name")
  }

  if (currentDepartment.code !== nextDepartment.code) {
    changedFields.push("code")
  }

  if (
    currentDepartment.description !==
    nextDepartment.description
  ) {
    changedFields.push("description")
  }

  if (
    currentDepartment.parentDepartmentId !==
    nextDepartment.parentDepartmentId
  ) {
    changedFields.push("parentDepartmentId")
  }

  return Object.freeze(changedFields)
}

function hasUpdateFields(
  payload: DepartmentUpdatePayload
): boolean {
  return (
    payload.name !== undefined ||
    payload.code !== undefined ||
    payload.description !== undefined ||
    payload.parentDepartmentId !== undefined
  )
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
  return value.trim().toLowerCase()
}

function success(
  departments: readonly ProjectedDepartment[],
  event: ProjectionInternalEvent
): DepartmentMutationResult {
  return Object.freeze({
    success: true,
    departments: Object.freeze([...departments]),
    event,
  })
}

function failure(
  code: string,
  message: string,
  changeSetId: string
): DepartmentMutationResult {
  return Object.freeze({
    success: false,
    issue: Object.freeze({
      code,
      message,
      changeSetId,
    }),
  })
}
