import type { PlanningChangeSet } from "../../change-sets"

export type ChangeSetEntity =
  | "department"
  | "team"
  | "position"
  | "employee"
  | "unknown"

export type ChangeSetAction =
  | "create"
  | "update"
  | "move"
  | "terminate"
  | "archive"
  | "unknown"

export type ChangeSetPresentation = Readonly<{
  entity: ChangeSetEntity
  action: ChangeSetAction
  entityLabel: string
  actionLabel: string
  title: string
  description: string
  subject: string | null
}>

type ChangeSetLike = Pick<
  PlanningChangeSet,
  "changeType" | "payload"
>

const ENTITY_LABELS: Record<ChangeSetEntity, string> = {
  department: "Departamento",
  team: "Equipe",
  position: "Cargo",
  employee: "Colaborador",
  unknown: "Alteração",
}

const ACTION_LABELS: Record<ChangeSetAction, string> = {
  create: "Criar",
  update: "Atualizar",
  move: "Mover",
  terminate: "Desligar",
  archive: "Arquivar",
  unknown: "Alterar",
}

const PAST_ACTION_LABELS: Record<ChangeSetAction, string> = {
  create: "criado",
  update: "atualizado",
  move: "movido",
  terminate: "desligado",
  archive: "arquivado",
  unknown: "alterado",
}

function isRecord(
  value: unknown
): value is Readonly<Record<string, unknown>> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function readNonEmptyString(
  record: Readonly<Record<string, unknown>>,
  key: string
): string | null {
  const value = record[key]

  if (typeof value !== "string") {
    return null
  }

  const normalizedValue = value.trim()

  return normalizedValue.length > 0
    ? normalizedValue
    : null
}

function parseChangeType(changeType: string): {
  entity: ChangeSetEntity
  action: ChangeSetAction
} {
  const [rawEntity, rawAction] = changeType.split(".")

  const entity: ChangeSetEntity =
    rawEntity === "department" ||
    rawEntity === "team" ||
    rawEntity === "position" ||
    rawEntity === "employee"
      ? rawEntity
      : "unknown"

  const action: ChangeSetAction =
    rawAction === "create" ||
    rawAction === "update" ||
    rawAction === "move" ||
    rawAction === "terminate" ||
    rawAction === "archive"
      ? rawAction
      : "unknown"

  return {
    entity,
    action,
  }
}

function getSubjectFromPayload(
  entity: ChangeSetEntity,
  payload: unknown
): string | null {
  if (!isRecord(payload)) {
    return null
  }

  const commonName =
    readNonEmptyString(payload, "name") ??
    readNonEmptyString(payload, "fullName") ??
    readNonEmptyString(payload, "title") ??
    readNonEmptyString(payload, "employeeName")

  if (commonName) {
    return commonName
  }

  const idKeysByEntity: Record<
    ChangeSetEntity,
    readonly string[]
  > = {
    department: ["departmentId"],
    team: ["teamId"],
    position: ["positionId"],
    employee: ["employeeId"],
    unknown: ["id"],
  }

  for (const key of idKeysByEntity[entity]) {
    const value = readNonEmptyString(payload, key)

    if (value) {
      return value
    }
  }

  return null
}

function getDescription(
  entity: ChangeSetEntity,
  action: ChangeSetAction
): string {
  const entityLabel = ENTITY_LABELS[entity]
  const pastActionLabel = PAST_ACTION_LABELS[action]

  return `${entityLabel} ${pastActionLabel} no cenário planejado.`
}

export function getChangeSetPresentation(
  changeSet: ChangeSetLike
): ChangeSetPresentation {
  const { entity, action } = parseChangeType(
    changeSet.changeType
  )

  const entityLabel = ENTITY_LABELS[entity]
  const actionLabel = ACTION_LABELS[action]
  const subject = getSubjectFromPayload(
    entity,
    changeSet.payload
  )

  return {
    entity,
    action,
    entityLabel,
    actionLabel,
    title: `${actionLabel} ${entityLabel.toLocaleLowerCase(
      "pt-BR"
    )}`,
    description: getDescription(entity, action),
    subject,
  }
}
