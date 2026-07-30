import type {
  KPIFeatureFlags,
  KPIThreshold,
} from "../contracts/kpi-definition"
import type { KPIAnalysis } from "../contracts/kpi-result"
import type { KPIDirection, KPIValueKind } from "../types/kpi-types"
import type { KPIEvaluationContext } from "./kpi-evaluation-context"
import { copyKPIEvaluationContext } from "./kpi-evaluation-context"

export type KPIDefinitionSnapshot = Readonly<{
  id: string
  key: string
  version: number
  name: string
  description: string
  category: string | null
  valueKind: KPIValueKind
  unit: string | null
  precision: number | null
  ownerModule: string
  favorableDirection: KPIDirection
  thresholds: readonly KPIThreshold[]
  target: number | null
  features: KPIFeatureFlags
}>

export type KPIEvaluation = Readonly<{
  id: string
  context: KPIEvaluationContext
  definition: KPIDefinitionSnapshot
  definitionVersion: number
  result: KPIAnalysis
  createdAt: Date
}>

export function copyKPIEvaluation(evaluation: KPIEvaluation): KPIEvaluation {
  return Object.freeze({
    ...evaluation,
    context: copyKPIEvaluationContext(evaluation.context),
    definition: Object.freeze({
      ...evaluation.definition,
      thresholds: Object.freeze(evaluation.definition.thresholds.map(
        (threshold) => Object.freeze({ ...threshold })
      )),
      features: Object.freeze({ ...evaluation.definition.features }),
    }),
    result: copyAnalysis(evaluation.result),
    createdAt: new Date(evaluation.createdAt.getTime()),
  })
}

function copyAnalysis(analysis: KPIAnalysis): KPIAnalysis {
  return Object.freeze({
    result: Object.freeze({
      ...analysis.result,
      calculatedAt: new Date(analysis.result.calculatedAt.getTime()),
    }),
    sla: analysis.sla ? Object.freeze({ ...analysis.sla }) : null,
    trend: analysis.trend ? Object.freeze({ ...analysis.trend }) : null,
    benchmark: analysis.benchmark ? Object.freeze({ ...analysis.benchmark }) : null,
    alerts: Object.freeze(analysis.alerts.map((alert) => Object.freeze({ ...alert }))),
    forecast: analysis.forecast ? Object.freeze({
      ...analysis.forecast,
      points: Object.freeze(analysis.forecast.points.map((point) => Object.freeze({
        ...point,
        occurredAt: new Date(point.occurredAt.getTime()),
      }))),
    }) : null,
  })
}
