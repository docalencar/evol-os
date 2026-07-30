import type {
  KPIAlert,
  KPIBenchmarkResult,
  KPIResult,
  KPISLAResult,
  KPITrendResult,
} from "../contracts/kpi-result"
import type { KPISeverity } from "../types/kpi-types"

export type KPIAlertContext = Readonly<{
  result: KPIResult
  sla: KPISLAResult | null
  trend: KPITrendResult | null
  benchmark: KPIBenchmarkResult | null
}>

export type KPIAlertRule = Readonly<{
  id: string
  severity: KPISeverity
  message: string
  matches(context: KPIAlertContext): boolean
}>

export class KPIAlertEngine {
  evaluate(
    context: KPIAlertContext,
    rules: readonly KPIAlertRule[]
  ): readonly KPIAlert[] {
    const ids = new Set<string>()
    const alerts = rules.flatMap((rule) => {
      if (ids.has(rule.id)) {
        throw new Error(`Regra de alerta duplicada: ${rule.id}.`)
      }
      ids.add(rule.id)
      return rule.matches(context)
        ? [Object.freeze({ id: rule.id, severity: rule.severity, message: rule.message })]
        : []
    })

    return Object.freeze(alerts)
  }
}
