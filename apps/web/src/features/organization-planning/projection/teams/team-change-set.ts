import type { ChangeSet } from "../../types/planning-contracts"
import type { ProjectionIssue } from "../contracts"

export const TEAM_CHANGE_TYPES = [
  "team.create",
  "team.update",
  "team.archive",
] as const

export type TeamChangeType =
  (typeof TEAM_CHANGE_TYPES)[number]

export type TeamCreatePayload = Readonly<{
  teamId: string
  name: string
  code: string | null
  description: string | null
  departmentId: string
}>

export type TeamUpdatePayload = Readonly<{
  teamId: string
  name?: string
  code?: string | null
  description?: string | null
  departmentId?: string
}>

export type TeamArchivePayload = Readonly<{
  teamId: string
}>

export type ParsedTeamChangeSet =
  | Readonly<{
      id: string
      changeType: "team.create"
      payload: TeamCreatePayload
    }>
  | Readonly<{
      id: string
      changeType: "team.update"
      payload: TeamUpdatePayload
    }>
  | Readonly<{
      id: string
      changeType: "team.archive"
      payload: TeamArchivePayload
    }>

export type TeamChangeSetParseResult =
  | Readonly<{
      success: true
      changeSet: ParsedTeamChangeSet
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

export function isTeamChangeType(
  changeType: string
): changeType is TeamChangeType {
  return TEAM_CHANGE_TYPES.some(
    (supportedChangeType) => supportedChangeType === changeType
  )
}

export function parseTeamChangeSet(
  changeSet: ChangeSet
): TeamChangeSetParseResult {
  switch (changeSet.changeType) {
    case "team.create":
      return parseCreateChangeSet(changeSet)

    case "team.update":
      return parseUpdateChangeSet(changeSet)

    case "team.archive":
      return parseArchiveChangeSet(changeSet)

    default:
      return failure(
        changeSet,
        "team.change_set.unsupported",
        `O tipo ${changeSet.changeType} não é suportado pelo executor de times.`
      )
  }
}

function parseCreateChangeSet(
  changeSet: ChangeSet
): TeamChangeSetParseResult {
  const teamId = readRequiredString(changeSet, "teamId")

  if (!teamId.success) {
    return teamId
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
      changeType: "team.create",
      payload: Object.freeze({
        teamId: teamId.value,
        name: name.value,
        code: code.value,
        description: description.value,
        departmentId: departmentId.value,
      }),
    }),
  })
}

function parseUpdateChangeSet(
  changeSet: ChangeSet
): TeamChangeSetParseResult {
  const teamId = readRequiredString(changeSet, "teamId")

  if (!teamId.success) {
    return teamId
  }

  const payload: {
    teamId: string
    name?: string
    code?: string | null
    description?: string | null
    departmentId?: string
  } = {
    teamId: teamId.value,
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

  if (hasOwn(changeSet.payload, "departmentId")) {
    const departmentId = readRequiredString(
      changeSet,
      "departmentId"
    )

    if (!departmentId.success) {
      return departmentId
    }

    payload.departmentId = departmentId.value
  }

  return Object.freeze({
    success: true,
    changeSet: Object.freeze({
      id: changeSet.id,
      changeType: "team.update",
      payload: Object.freeze(payload),
    }),
  })
}

function parseArchiveChangeSet(
  changeSet: ChangeSet
): TeamChangeSetParseResult {
  const teamId = readRequiredString(changeSet, "teamId")

  if (!teamId.success) {
    return teamId
  }

  return Object.freeze({
    success: true,
    changeSet: Object.freeze({
      id: changeSet.id,
      changeType: "team.archive",
      payload: Object.freeze({
        teamId: teamId.value,
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
    "team.change_set.invalid_payload",
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
