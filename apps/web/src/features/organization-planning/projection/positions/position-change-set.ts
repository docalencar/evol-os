import {
  POSITION_EMPLOYMENT_TYPES,
  POSITION_HIERARCHICAL_LEVELS,
  POSITION_TRAVEL_REQUIREMENTS,
  POSITION_WORK_MODELS,
  type PositionEmploymentType,
  type PositionHierarchicalLevel,
  type PositionTravelRequirement,
  type PositionWorkModel,
} from "../../../organization/positions/types/position"
import type { ChangeSet } from "../../types/planning-contracts"
import type { ProjectionIssue } from "../contracts"

export const POSITION_CHANGE_TYPES = [
  "position.create",
  "position.update",
  "position.archive",
  "position.move",
] as const

export type PositionChangeType =
  (typeof POSITION_CHANGE_TYPES)[number]

export type PositionCreatePayload = Readonly<{
  positionId: string
  name: string
  description: string | null
  departmentId: string | null
  hierarchicalLevel: PositionHierarchicalLevel
  weeklyWorkloadHours: number
  workModel: PositionWorkModel
  employmentType: PositionEmploymentType
  travelRequirement: PositionTravelRequirement
}>

export type PositionUpdatePayload = Readonly<{
  positionId: string
  name?: string
  description?: string | null
  hierarchicalLevel?: PositionHierarchicalLevel
  weeklyWorkloadHours?: number
  workModel?: PositionWorkModel
  employmentType?: PositionEmploymentType
  travelRequirement?: PositionTravelRequirement
}>

export type PositionArchivePayload = Readonly<{
  positionId: string
}>

export type PositionMovePayload = Readonly<{
  positionId: string
  departmentId: string | null
}>

export type ParsedPositionChangeSet =
  | Readonly<{
      id: string
      changeType: "position.create"
      payload: PositionCreatePayload
    }>
  | Readonly<{
      id: string
      changeType: "position.update"
      payload: PositionUpdatePayload
    }>
  | Readonly<{
      id: string
      changeType: "position.archive"
      payload: PositionArchivePayload
    }>
  | Readonly<{
      id: string
      changeType: "position.move"
      payload: PositionMovePayload
    }>

export type PositionChangeSetParseResult =
  | Readonly<{
      success: true
      changeSet: ParsedPositionChangeSet
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

export function isPositionChangeType(
  changeType: string
): changeType is PositionChangeType {
  return POSITION_CHANGE_TYPES.some(
    (supportedChangeType) => supportedChangeType === changeType
  )
}

export function parsePositionChangeSet(
  changeSet: ChangeSet
): PositionChangeSetParseResult {
  switch (changeSet.changeType) {
    case "position.create":
      return parseCreateChangeSet(changeSet)

    case "position.update":
      return parseUpdateChangeSet(changeSet)

    case "position.archive":
      return parseArchiveChangeSet(changeSet)

    case "position.move":
      return parseMoveChangeSet(changeSet)

    default:
      return failure(
        changeSet,
        "position.change_set.unsupported",
        `O tipo ${changeSet.changeType} não é suportado pelo executor de cargos.`
      )
  }
}

function parseCreateChangeSet(
  changeSet: ChangeSet
): PositionChangeSetParseResult {
  const positionId = readRequiredString(
    changeSet,
    "positionId"
  )

  if (!positionId.success) {
    return positionId
  }

  const name = readRequiredString(changeSet, "name")

  if (!name.success) {
    return name
  }

  const description = readOptionalNullableString(
    changeSet,
    "description"
  )

  if (!description.success) {
    return description
  }

  const departmentId = readOptionalNullableString(
    changeSet,
    "departmentId"
  )

  if (!departmentId.success) {
    return departmentId
  }

  const hierarchicalLevel = readRequiredEnum(
    changeSet,
    "hierarchicalLevel",
    POSITION_HIERARCHICAL_LEVELS
  )

  if (!hierarchicalLevel.success) {
    return hierarchicalLevel
  }

  const weeklyWorkloadHours = readWeeklyWorkloadHours(
    changeSet
  )

  if (!weeklyWorkloadHours.success) {
    return weeklyWorkloadHours
  }

  const workModel = readRequiredEnum(
    changeSet,
    "workModel",
    POSITION_WORK_MODELS
  )

  if (!workModel.success) {
    return workModel
  }

  const employmentType = readRequiredEnum(
    changeSet,
    "employmentType",
    POSITION_EMPLOYMENT_TYPES
  )

  if (!employmentType.success) {
    return employmentType
  }

  const travelRequirement = readRequiredEnum(
    changeSet,
    "travelRequirement",
    POSITION_TRAVEL_REQUIREMENTS
  )

  if (!travelRequirement.success) {
    return travelRequirement
  }

  return Object.freeze({
    success: true,
    changeSet: Object.freeze({
      id: changeSet.id,
      changeType: "position.create",
      payload: Object.freeze({
        positionId: positionId.value,
        name: name.value,
        description: description.value,
        departmentId: departmentId.value,
        hierarchicalLevel: hierarchicalLevel.value,
        weeklyWorkloadHours: weeklyWorkloadHours.value,
        workModel: workModel.value,
        employmentType: employmentType.value,
        travelRequirement: travelRequirement.value,
      }),
    }),
  })
}

function parseUpdateChangeSet(
  changeSet: ChangeSet
): PositionChangeSetParseResult {
  const positionId = readRequiredString(
    changeSet,
    "positionId"
  )

  if (!positionId.success) {
    return positionId
  }

  const payload: {
    positionId: string
    name?: string
    description?: string | null
    hierarchicalLevel?: PositionHierarchicalLevel
    weeklyWorkloadHours?: number
    workModel?: PositionWorkModel
    employmentType?: PositionEmploymentType
    travelRequirement?: PositionTravelRequirement
  } = {
    positionId: positionId.value,
  }

  if (hasOwn(changeSet.payload, "name")) {
    const name = readRequiredString(changeSet, "name")

    if (!name.success) {
      return name
    }

    payload.name = name.value
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

  if (hasOwn(changeSet.payload, "hierarchicalLevel")) {
    const hierarchicalLevel = readRequiredEnum(
      changeSet,
      "hierarchicalLevel",
      POSITION_HIERARCHICAL_LEVELS
    )

    if (!hierarchicalLevel.success) {
      return hierarchicalLevel
    }

    payload.hierarchicalLevel = hierarchicalLevel.value
  }

  if (hasOwn(changeSet.payload, "weeklyWorkloadHours")) {
    const weeklyWorkloadHours = readWeeklyWorkloadHours(
      changeSet
    )

    if (!weeklyWorkloadHours.success) {
      return weeklyWorkloadHours
    }

    payload.weeklyWorkloadHours = weeklyWorkloadHours.value
  }

  if (hasOwn(changeSet.payload, "workModel")) {
    const workModel = readRequiredEnum(
      changeSet,
      "workModel",
      POSITION_WORK_MODELS
    )

    if (!workModel.success) {
      return workModel
    }

    payload.workModel = workModel.value
  }

  if (hasOwn(changeSet.payload, "employmentType")) {
    const employmentType = readRequiredEnum(
      changeSet,
      "employmentType",
      POSITION_EMPLOYMENT_TYPES
    )

    if (!employmentType.success) {
      return employmentType
    }

    payload.employmentType = employmentType.value
  }

  if (hasOwn(changeSet.payload, "travelRequirement")) {
    const travelRequirement = readRequiredEnum(
      changeSet,
      "travelRequirement",
      POSITION_TRAVEL_REQUIREMENTS
    )

    if (!travelRequirement.success) {
      return travelRequirement
    }

    payload.travelRequirement = travelRequirement.value
  }

  return Object.freeze({
    success: true,
    changeSet: Object.freeze({
      id: changeSet.id,
      changeType: "position.update",
      payload: Object.freeze(payload),
    }),
  })
}

function parseArchiveChangeSet(
  changeSet: ChangeSet
): PositionChangeSetParseResult {
  const positionId = readRequiredString(
    changeSet,
    "positionId"
  )

  if (!positionId.success) {
    return positionId
  }

  return Object.freeze({
    success: true,
    changeSet: Object.freeze({
      id: changeSet.id,
      changeType: "position.archive",
      payload: Object.freeze({
        positionId: positionId.value,
      }),
    }),
  })
}

function parseMoveChangeSet(
  changeSet: ChangeSet
): PositionChangeSetParseResult {
  const positionId = readRequiredString(
    changeSet,
    "positionId"
  )

  if (!positionId.success) {
    return positionId
  }

  const departmentId = readNullableString(
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
      changeType: "position.move",
      payload: Object.freeze({
        positionId: positionId.value,
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

type NumberReadResult =
  | Readonly<{
      success: true
      value: number
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

type EnumReadResult<TValue extends string> =
  | Readonly<{
      success: true
      value: TValue
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

function readWeeklyWorkloadHours(
  changeSet: ChangeSet
): NumberReadResult {
  const value = changeSet.payload.weeklyWorkloadHours

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 168
  ) {
    return invalidField(
      changeSet,
      "weeklyWorkloadHours",
      "um número inteiro entre 1 e 168"
    )
  }

  return Object.freeze({
    success: true,
    value,
  })
}

function readRequiredEnum<const TValue extends string>(
  changeSet: ChangeSet,
  field: string,
  supportedValues: readonly TValue[]
): EnumReadResult<TValue> {
  const value = changeSet.payload[field]

  if (
    typeof value !== "string" ||
    !supportedValues.some(
      (supportedValue) => supportedValue === value
    )
  ) {
    return invalidField(
      changeSet,
      field,
      `um dos valores: ${supportedValues.join(", ")}`
    )
  }

  return Object.freeze({
    success: true,
    value: value as TValue,
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
    "position.change_set.invalid_payload",
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
