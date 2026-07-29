import type { ChangeSet } from "../../types/planning-contracts"
import type { ProjectionIssue } from "../contracts"

export const VACANCY_CHANGE_TYPES = [
  "vacancy.create",
  "vacancy.update",
  "vacancy.close",
] as const

export type VacancyChangeType = (typeof VACANCY_CHANGE_TYPES)[number]

type VacancyPlacement = Readonly<{
  positionId?: string | null
  departmentId?: string | null
  teamId?: string | null
}>

export type VacancyCreatePayload = VacancyPlacement & Readonly<{ vacancyId: string }>
export type VacancyUpdatePayload = VacancyPlacement & Readonly<{ vacancyId: string }>
export type VacancyClosePayload = Readonly<{ vacancyId: string }>

export type ParsedVacancyChangeSet =
  | Readonly<{ id: string; changeType: "vacancy.create"; payload: VacancyCreatePayload }>
  | Readonly<{ id: string; changeType: "vacancy.update"; payload: VacancyUpdatePayload }>
  | Readonly<{ id: string; changeType: "vacancy.close"; payload: VacancyClosePayload }>

export type VacancyChangeSetParseResult =
  | Readonly<{ success: true; changeSet: ParsedVacancyChangeSet }>
  | Readonly<{ success: false; issue: ProjectionIssue }>

export function isVacancyChangeType(changeType: string): changeType is VacancyChangeType {
  return VACANCY_CHANGE_TYPES.some((candidate) => candidate === changeType)
}

export function parseVacancyChangeSet(changeSet: ChangeSet): VacancyChangeSetParseResult {
  if (!isVacancyChangeType(changeSet.changeType)) {
    return failure(changeSet, "vacancy.change_set.unsupported", `O tipo ${changeSet.changeType} não é suportado pelo executor de vagas.`)
  }
  const vacancyId = readRequiredId(changeSet, "vacancyId")
  if (!vacancyId.success) return vacancyId
  if (changeSet.changeType === "vacancy.close") {
    return parsed(changeSet.id, changeSet.changeType, { vacancyId: vacancyId.value })
  }

  const payload: { vacancyId: string; positionId?: string | null; departmentId?: string | null; teamId?: string | null } = {
    vacancyId: vacancyId.value,
  }
  for (const field of ["positionId", "departmentId", "teamId"] as const) {
    if (!own(changeSet.payload, field)) continue
    const value = readNullableId(changeSet, field)
    if (!value.success) return value
    payload[field] = value.value
  }
  if (changeSet.changeType === "vacancy.update" && !hasPlacement(payload)) {
    return failure(changeSet, "vacancy.update.empty_patch", `O change set ${changeSet.id} não possui campos para atualização.`)
  }
  return parsed(changeSet.id, changeSet.changeType, payload)
}

function hasPlacement(payload: VacancyPlacement) {
  return ["positionId", "departmentId", "teamId"].some((field) => own(payload, field))
}

function readRequiredId(changeSet: ChangeSet, field: string) {
  const value = changeSet.payload[field]
  if (typeof value !== "string" || value.trim().length === 0) {
    return failure(changeSet, "vacancy.change_set.invalid_payload", `O campo ${field} do change set ${changeSet.id} deve ser uma string não vazia.`)
  }
  return Object.freeze({ success: true as const, value: value.trim() })
}

function readNullableId(changeSet: ChangeSet, field: string) {
  const value = changeSet.payload[field]
  if (value === null) return Object.freeze({ success: true as const, value: null })
  if (typeof value !== "string" || value.trim().length === 0) {
    return failure(changeSet, "vacancy.change_set.invalid_payload", `O campo ${field} do change set ${changeSet.id} deve ser uma string não vazia ou null.`)
  }
  return Object.freeze({ success: true as const, value: value.trim() })
}

function parsed<TType extends ParsedVacancyChangeSet["changeType"]>(id: string, changeType: TType, payload: Extract<ParsedVacancyChangeSet, { changeType: TType }>["payload"]): VacancyChangeSetParseResult {
  return Object.freeze({ success: true, changeSet: Object.freeze({ id, changeType, payload: Object.freeze(payload) }) }) as VacancyChangeSetParseResult
}

function failure(changeSet: ChangeSet, code: string, message: string): Readonly<{ success: false; issue: ProjectionIssue }> {
  return Object.freeze({ success: false, issue: Object.freeze({ code, message, changeSetId: changeSet.id }) })
}

function own(value: object, property: string) {
  return Object.prototype.hasOwnProperty.call(value, property)
}
