import type { KPIResult, KPISLAResult } from "../contracts/kpi-result"

export type KPISLARule = Readonly<{
  target: number
  operator: "at-least" | "at-most"
}>

export class KPISLAEngine {
  evaluate(result: KPIResult, rule: KPISLARule): KPISLAResult {
    if (!Number.isFinite(rule.target)) {
      throw new RangeError("A meta de SLA deve ser um número finito.")
    }

    if (result.value === null) {
      return Object.freeze({ status: "unavailable", target: rule.target, delta: null })
    }

    const met = rule.operator === "at-least"
      ? result.value >= rule.target
      : result.value <= rule.target

    return Object.freeze({
      status: met ? "met" : "breached",
      target: rule.target,
      delta: result.value - rule.target,
    })
  }
}
