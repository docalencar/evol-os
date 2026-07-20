export function calculateAverage(
  values: readonly number[]
): number | null {
  if (values.length === 0) {
    return null
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0
  )

  return total / values.length
}
