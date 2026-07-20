import { calculateAverage } from "./calculate-average"

export function calculateStandardDeviation(
  values: readonly number[]
): number | null {
  const average = calculateAverage(values)

  if (average === null) {
    return null
  }

  const variance =
    values.reduce((sum, value) => {
      const difference = value - average

      return sum + difference ** 2
    }, 0) / values.length

  return Math.sqrt(variance)
}
