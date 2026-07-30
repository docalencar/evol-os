import type { KPIDefinition } from "../contracts/kpi-definition"
import type { KPIResult } from "../contracts/kpi-result"

export class KPICalculatorEngine {
  constructor(private readonly clock: () => Date = () => new Date()) {}

  calculate<TInput>(
    definition: KPIDefinition<TInput>,
    input: TInput
  ): KPIResult {
    const value = definition.calculate(input)

    if (value !== null && !Number.isFinite(value)) {
      throw new RangeError(
        `O KPI ${definition.id} produziu um valor não finito.`
      )
    }

    return Object.freeze({
      definitionId: definition.id,
      value,
      availability: value === null ? "unavailable" : "available",
      calculatedAt: new Date(this.clock().getTime()),
    })
  }
}
