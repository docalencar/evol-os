import {
  KPIAlertEngine,
  type KPIAlertRule,
} from "../alerts/alert-engine"
import {
  KPIBenchmarkEngine,
  type KPIBenchmark,
} from "../benchmarks/benchmark-engine"
import { KPICalculatorEngine } from "../calculators/calculator-engine"
import type { KPIDefinition } from "../contracts/kpi-definition"
import type { KPIAnalysis } from "../contracts/kpi-result"
import {
  KPIForecastEngine,
  type KPIForecastOptions,
} from "../forecast/forecast-engine"
import { KPISLAEngine, type KPISLARule } from "../sla/sla-engine"
import { KPITrendEngine } from "../trends/trend-engine"
import type { KPITimePoint } from "../types/kpi-types"

export type KPIAnalysisInput<TInput> = Readonly<{
  definition: KPIDefinition<TInput>
  source: TInput
  history?: readonly KPITimePoint[]
  sla?: KPISLARule
  benchmark?: KPIBenchmark
  alertRules?: readonly KPIAlertRule[]
  forecast?: KPIForecastOptions
}>

export class KPIEngine {
  constructor(
    private readonly calculator: KPICalculatorEngine = new KPICalculatorEngine(),
    private readonly slaEngine: KPISLAEngine = new KPISLAEngine(),
    private readonly trendEngine: KPITrendEngine = new KPITrendEngine(),
    private readonly benchmarkEngine: KPIBenchmarkEngine = new KPIBenchmarkEngine(),
    private readonly alertEngine: KPIAlertEngine = new KPIAlertEngine(),
    private readonly forecastEngine: KPIForecastEngine = new KPIForecastEngine()
  ) {}

  static create(): KPIEngine {
    return new KPIEngine()
  }

  analyze<TInput>(input: KPIAnalysisInput<TInput>): KPIAnalysis {
    const result = this.calculator.calculate(input.definition, input.source)
    const sla = input.sla ? this.slaEngine.evaluate(result, input.sla) : null
    const trend = input.history ? this.trendEngine.analyze(input.history) : null
    const benchmark = input.benchmark
      ? this.benchmarkEngine.compare(result, input.benchmark)
      : null
    const alerts = this.alertEngine.evaluate(
      { result, sla, trend, benchmark },
      input.alertRules ?? []
    )
    const forecast = input.forecast
      ? this.forecastEngine.forecast(input.history ?? [], input.forecast)
      : null

    return Object.freeze({ result, sla, trend, benchmark, alerts, forecast })
  }
}
