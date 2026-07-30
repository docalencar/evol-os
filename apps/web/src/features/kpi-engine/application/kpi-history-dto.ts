import type { KPIEvaluation } from "../evaluations"

export type KPIHistoryEntryDTO = Readonly<{
  id: string
  companyId: string
  definitionKey: string
  definitionVersion: number
  ownerModule: string
  scopeType: KPIEvaluation["context"]["scopeType"]
  scopeId: string | null
  periodStart: string
  periodEnd: string
  evaluatedAt: string
  value: number | null
  availability: "available" | "unavailable"
  createdAt: string
}>

export function toKPIHistoryEntryDTO(
  evaluation: KPIEvaluation
): KPIHistoryEntryDTO {
  return Object.freeze({
    id: evaluation.id,
    companyId: evaluation.context.companyId,
    definitionKey: evaluation.context.definitionKey,
    definitionVersion: evaluation.definitionVersion,
    ownerModule: evaluation.context.ownerModule,
    scopeType: evaluation.context.scopeType,
    scopeId: evaluation.context.scopeId ?? null,
    periodStart: evaluation.context.periodStart.toISOString(),
    periodEnd: evaluation.context.periodEnd.toISOString(),
    evaluatedAt: evaluation.context.evaluatedAt.toISOString(),
    value: evaluation.result.result.value,
    availability: evaluation.result.result.availability,
    createdAt: evaluation.createdAt.toISOString(),
  })
}
