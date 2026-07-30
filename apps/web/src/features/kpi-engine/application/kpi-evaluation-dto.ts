import type { KPIDefinitionSnapshot, KPIEvaluationContext } from "../evaluations"
import type {
  KPIAlert,
  KPIBenchmarkResult,
  KPISLAResult,
  KPITrendResult,
} from "../contracts/kpi-result"
import type { JsonObject } from "../types/json-types"

export type KPIEvaluationContextDTO = Omit<
  KPIEvaluationContext,
  "periodStart" | "periodEnd" | "evaluatedAt" | "metadata"
> & Readonly<{
  periodStart: string
  periodEnd: string
  evaluatedAt: string
  metadata: JsonObject
}>

export type KPIEvaluationDTO = Readonly<{
  id: string
  context: KPIEvaluationContextDTO
  definition: KPIDefinitionSnapshot
  definitionVersion: number
  result: Readonly<{
    result: Readonly<{
      definitionId: string
      value: number | null
      availability: "available" | "unavailable"
      calculatedAt: string
    }>
    sla: KPISLAResult | null
    trend: KPITrendResult | null
    benchmark: KPIBenchmarkResult | null
    alerts: readonly KPIAlert[]
    forecast: Readonly<{
      status: "available" | "unavailable"
      points: readonly Readonly<{ occurredAt: string; value: number }>[]
    }> | null
  }>
  createdAt: string
}>
