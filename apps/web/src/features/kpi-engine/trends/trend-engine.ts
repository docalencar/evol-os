import type { KPITrendResult } from "../contracts/kpi-result"
import type { KPITimePoint } from "../types/kpi-types"

const UNAVAILABLE_TREND: KPITrendResult = Object.freeze({
  direction: "unavailable",
  absoluteChange: null,
  percentageChange: null,
})

export class KPITrendEngine {
  analyze(series: readonly KPITimePoint[]): KPITrendResult {
    if (series.length < 2) return UNAVAILABLE_TREND

    const ordered = [...series].sort(
      (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime()
    )
    const previous = ordered.at(-2)?.value
    const current = ordered.at(-1)?.value

    if (previous === undefined || current === undefined) {
      return UNAVAILABLE_TREND
    }
    assertFiniteSeries(ordered)

    const absoluteChange = current - previous
    const percentageChange = previous === 0
      ? current === 0 ? 0 : null
      : (absoluteChange / Math.abs(previous)) * 100

    return Object.freeze({
      direction: absoluteChange > 0 ? "up" : absoluteChange < 0 ? "down" : "stable",
      absoluteChange,
      percentageChange,
    })
  }
}

function assertFiniteSeries(series: readonly KPITimePoint[]): void {
  if (series.some((point) => !Number.isFinite(point.value))) {
    throw new RangeError("A série histórica contém um valor não finito.")
  }
}
