import type { KPIAlertRule } from "../alerts/alert-engine"
import type { KPIBenchmark } from "../benchmarks/benchmark-engine"
import type { Clock } from "../contracts/clock"
import type { IdGenerator } from "../contracts/id-generator"
import type { KPIDefinition } from "../contracts/kpi-definition"
import type { KPIForecastOptions } from "../forecast/forecast-engine"
import type { KPIEngine } from "../application/kpi-engine"
import type { KPIDefinitionVersion } from "../registry"
import type { KPIRegistry } from "../registry"
import type { KPISLARule } from "../sla/sla-engine"
import type { KPITimePoint } from "../types/kpi-types"
import type { KPIEvaluationContextInput } from "./kpi-evaluation-context"
import { createKPIEvaluationContext } from "./kpi-evaluation-context"
import { KPIEvaluationError } from "./kpi-evaluation-error"
import { copyKPIEvaluation, type KPIDefinitionSnapshot, type KPIEvaluation } from "./kpi-evaluation"

export type CreateKPIEvaluationInput = Readonly<{
  context: KPIEvaluationContextInput
  source: unknown
  history?: readonly KPITimePoint[]
  sla?: KPISLARule
  benchmark?: KPIBenchmark
  alertRules?: readonly KPIAlertRule[]
  forecast?: KPIForecastOptions
}>

export class KPIEvaluationService {
  constructor(
    private readonly registry: KPIRegistry,
    private readonly engine: KPIEngine,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator
  ) {}

  create(input: CreateKPIEvaluationInput): KPIEvaluation {
    const context = createKPIEvaluationContext(input.context)
    const versionedDefinition = context.definitionVersion === undefined
      ? this.registry.getActiveByKey(context.definitionKey, context.evaluatedAt)
      : this.registry.getByKey(context.definitionKey, context.definitionVersion)

    if (versionedDefinition.definition.ownerModule !== context.ownerModule) {
      throw new KPIEvaluationError(
        "OWNER_MODULE_MISMATCH",
        `O módulo ${context.ownerModule} não é dono da definição ${context.definitionKey}.`
      )
    }

    let result
    try {
      result = this.engine.analyze({
        definition: versionedDefinition.definition,
        source: input.source,
        history: input.history,
        sla: input.sla,
        benchmark: input.benchmark,
        alertRules: input.alertRules,
        forecast: input.forecast,
      })
    } catch (error) {
      throw new KPIEvaluationError(
        "CALCULATION_FAILED",
        `Falha ao calcular ${context.definitionKey}.`,
        { cause: error }
      )
    }

    return copyKPIEvaluation({
      id: this.idGenerator.generate(),
      context,
      definition: createSnapshot(versionedDefinition),
      definitionVersion: versionedDefinition.version,
      result,
      createdAt: this.clock.now(),
    })
  }
}

function createSnapshot(versioned: KPIDefinitionVersion): KPIDefinitionSnapshot {
  const definition: KPIDefinition<unknown> = versioned.definition
  return Object.freeze({
    id: definition.id,
    key: versioned.key,
    version: versioned.version,
    name: definition.name,
    description: definition.description,
    category: definition.category ?? null,
    valueKind: definition.valueKind,
    unit: definition.unit ?? null,
    precision: definition.precision ?? null,
    ownerModule: definition.ownerModule ?? "",
    favorableDirection: definition.favorableDirection,
    thresholds: Object.freeze((definition.thresholds ?? []).map(
      (threshold) => Object.freeze({ ...threshold })
    )),
    target: definition.target ?? null,
    features: Object.freeze({
      trend: definition.features?.trend ?? false,
      benchmark: definition.features?.benchmark ?? false,
      forecast: definition.features?.forecast ?? false,
      sla: definition.features?.sla ?? false,
    }),
  })
}
