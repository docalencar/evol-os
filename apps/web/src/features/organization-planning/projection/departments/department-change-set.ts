import type { ChangeSet } from "../../types/planning-contracts"
import type { ProjectionIssue } from "../contracts"

export const DEPARTMENT_CHANGE_TYPES = [
  "department.create",
  "department.update",
  "department.archive",
] as const

export type DepartmentChangeType =
  (typeof DEPARTMENT_CHANGE_TYPES)[number]

export type DepartmentCreatePayload = Readonly<{
  departmentId: string
  name: string
  code: string | null
  description: string | null
  parentDepartmentId: string | null
}>

export type DepartmentUpdatePayload = Readonly<{
  departmentId: string
  name?: string
  code?: string | null
  description?: string | null
  parentDepartmentId?: string | null
}>

export type DepartmentArchivePayload = Readonly<{
  departmentId: string
}>

export type ParsedDepartmentChangeSet =
  | Readonly<{
      id: string
      changeType: "department.create"
      payload: DepartmentCreatePayload
    }>
  | Readonly<{
      id: string
      changeType: "department.update"
      payload: DepartmentUpdatePayload
    }>
  | Readonly<{
      id: string
      changeType: "department.archive"
      payload: DepartmentArchivePayload
    }>

export type DepartmentChangeSetParseResult =
  | Readonly<{
      success: true
      changeSet: ParsedDepartmentChangeSet
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

export function isDepartmentChangeType(
  changeType: string
): changeType is DepartmentChangeType {
  return DEPARTMENT_CHANGE_TYPES.some(
    (supportedChangeType) => supportedChangeType === changeType
  )
}

export function parseDepartmentChangeSet(
  changeSet: ChangeSet
): DepartmentChangeSetParseResult {
  switch (changeSet.changeType) {
    case "department.create":
      return parseCreateChangeSet(changeSet)

    case "department.update":
      return parseUpdateChangeSet(changeSet)

    case "department.archive":
      return parseArchiveChangeSet(changeSet)

    default:
      return failure(
        changeSet,
        "department.change_set.unsupported",
        `O tipo ${changeSet.changeType} não é suportado pelo executor de departamentos.`
      )
  }
}

function parseCreateChangeSet(
  changeSet: ChangeSet
): DepartmentChangeSetParseResult {
  const departmentId = readRequiredString(
    changeSet,
    "departmentId"
  )

  if (!departmentId.success) {
    return departmentId
  }

  const name = readRequiredString(changeSet, "name")

  if (!name.success) {
    return name
  }

  const code = readOptionalNullableString(changeSet, "code")

  if (!code.success) {
    return code
  }

  const description = readOptionalNullableString(
    changeSet,
    "description"
  )

  if (!description.success) {
    return description
  }

  const parentDepartmentId = readOptionalNullableString(
    changeSet,
    "parentDepartmentId"
  )

  if (!parentDepartmentId.success) {
    return parentDepartmentId
  }

  return Object.freeze({
    success: true,
    changeSet: Object.freeze({
      id: changeSet.id,
      changeType: "department.create",
      payload: Object.freeze({
        departmentId: departmentId.value,
        name: name.value,
        code: code.value,
        description: description.value,
        parentDepartmentId: parentDepartmentId.value,
      }),
    }),
  })
}

function parseUpdateChangeSet(
  changeSet: ChangeSet
): DepartmentChangeSetParseResult {
  const departmentId = readRequiredString(
    changeSet,
    "departmentId"
  )

  if (!departmentId.success) {
    return departmentId
  }

  const payload: {
    departmentId: string
    name?: string
    code?: string | null
    description?: string | null
    parentDepartmentId?: string | null
  } = {
    departmentId: departmentId.value,
  }

  if (hasOwn(changeSet.payload, "name")) {
    const name = readRequiredString(changeSet, "name")

    if (!name.success) {
      return name
    }

    payload.name = name.value
  }

  if (hasOwn(changeSet.payload, "code")) {
    const code = readNullableString(changeSet, "code")

    if (!code.success) {
      return code
    }

    payload.code = code.value
  }

  if (hasOwn(changeSet.payload, "description")) {
    const description = readNullableString(
      changeSet,
      "description"
    )

    if (!description.success) {
      return description
    }

    payload.description = description.value
  }

  if (hasOwn(changeSet.payload, "parentDepartmentId")) {
    const parentDepartmentId = readNullableString(
      changeSet,
      "parentDepartmentId"
    )

    if (!parentDepartmentId.success) {
      return parentDepartmentId
    }

    payload.parentDepartmentId = parentDepartmentId.value
  }

  return Object.freeze({
    success: true,
    changeSet: Object.freeze({
      id: changeSet.id,
      changeType: "department.update",
      payload: Object.freeze(payload),
    }),
  })
}

function parseArchiveChangeSet(
  changeSet: ChangeSet
): DepartmentChangeSetParseResult {
  const departmentId = readRequiredString(
    changeSet,
    "departmentId"
  )

  if (!departmentId.success) {
    return departmentId
  }

  return Object.freeze({
    success: true,
    changeSet: Object.freeze({
      id: changeSet.id,
      changeType: "department.archive",
      payload: Object.freeze({
        departmentId: departmentId.value,
      }),
    }),
  })
}

type StringReadResult =
  | Readonly<{
      success: true
      value: string
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

type NullableStringReadResult =
  | Readonly<{
      success: true
      value: string | null
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

function readRequiredString(
  changeSet: ChangeSet,
  field: string
): StringReadResult {
  const value = changeSet.payload[field]

  if (typeof value !== "string") {
    return invalidField(changeSet, field, "uma string")
  }

  const normalized = value.trim()

  if (normalized.length === 0) {
    return invalidField(
      changeSet,
      field,
      "uma string não vazia"
    )
  }

  return Object.freeze({
    success: true,
    value: normalized,
  })
}

function readOptionalNullableString(
  changeSet: ChangeSet,
  field: string
): NullableStringReadResult {
  if (!hasOwn(changeSet.payload, field)) {
    return Object.freeze({
      success: true,
      value: null,
    })
  }

  return readNullableString(changeSet, field)
}

function readNullableString(
  changeSet: ChangeSet,
  field: string
): NullableStringReadResult {
  const value = changeSet.payload[field]

  if (value === null) {
    return Object.freeze({
      success: true,
      value: null,
    })
  }

  if (typeof value !== "string") {
    return invalidField(
      changeSet,
      field,
      "uma string ou null"
    )
  }

  const normalized = value.trim()

  return Object.freeze({
    success: true,
    value: normalized.length > 0 ? normalized : null,
  })
}

function invalidField(
  changeSet: ChangeSet,
  field: string,
  expected: string
): Readonly<{
  success: false
  issue: ProjectionIssue
}> {
  return failure(
    changeSet,
    "department.change_set.invalid_payload",
    `O campo ${field} do change set ${changeSet.id} deve ser ${expected}.`
  )
}

function failure(
  changeSet: ChangeSet,
  code: string,
  message: string
): Readonly<{
  success: false
  issue: ProjectionIssue
}> {
  return Object.freeze({
    success: false,
    issue: Object.freeze({
      code,
      message,
      changeSetId: changeSet.id,
    }),
  })
}

function hasOwn(
  value: Readonly<Record<string, unknown>>,
  property: string
): boolean {
  return Object.prototype.hasOwnProperty.call(value, property)
}
