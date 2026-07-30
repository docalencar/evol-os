import type { KPIForecastResult } from "../contracts/kpi-result"
import type { KPITimePoint } from "../types/kpi-types"

export type KPIForecastOptions = Readonly<{
  horizon: number
  intervalMilliseconds: number
}>

export class KPIForecastEngine {
  forecast(
    series: readonly KPITimePoint[],
    options: KPIForecastOptions
  ): KPIForecastResult {
    assertOptions(options)
    if (series.length < 2) {
      return Object.freeze({ status: "unavailable", points: Object.freeze([]) })
    }

    const ordered = [...series].sort(
      (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime()
    )
    if (ordered.some((point) => !Number.isFinite(point.value))) {
      throw new RangeError("A série histórica contém um valor não finito.")
    }

    const { slope, intercept } = linearRegression(ordered.map((point) => point.value))
    const lastTime = ordered.at(-1)?.occurredAt.getTime()
    if (lastTime === undefined) {
      return Object.freeze({ status: "unavailable", points: Object.freeze([]) })
    }

    const points = Array.from({ length: options.horizon }, (_, index) => {
      const step = ordered.length + index
      return Object.freeze({
        occurredAt: new Date(lastTime + options.intervalMilliseconds * (index + 1)),
        value: intercept + slope * step,
      })
    })

    return Object.freeze({ status: "available", points: Object.freeze(points) })
  }
}

function assertOptions(options: KPIForecastOptions): void {
  if (!Number.isInteger(options.horizon) || options.horizon <= 0) {
    throw new RangeError("O horizonte da previsão deve ser um inteiro positivo.")
  }
  if (!Number.isFinite(options.intervalMilliseconds) || options.intervalMilliseconds <= 0) {
    throw new RangeError("O intervalo da previsão deve ser positivo.")
  }
}

function linearRegression(values: readonly number[]): Readonly<{ slope: number; intercept: number }> {
  const count = values.length
  const xMean = (count - 1) / 2
  const yMean = values.reduce((total, value) => total + value, 0) / count
  let numerator = 0
  let denominator = 0

  values.forEach((value, index) => {
    numerator += (index - xMean) * (value - yMean)
    denominator += (index - xMean) ** 2
  })

  const slope = denominator === 0 ? 0 : numerator / denominator
  return Object.freeze({ slope, intercept: yMean - slope * xMean })
}
