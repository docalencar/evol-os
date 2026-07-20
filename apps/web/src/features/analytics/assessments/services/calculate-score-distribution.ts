import type {
  AssessmentScoreDistributionItem,
} from "../types/assessment-statistics"

export function calculateScoreDistribution(
  values: readonly number[]
): AssessmentScoreDistributionItem[] {
  if (values.length === 0) {
    return []
  }

  const occurrences = new Map<number, number>()

  for (const value of values) {
    occurrences.set(
      value,
      (occurrences.get(value) ?? 0) + 1
    )
  }

  return [...occurrences.entries()]
    .sort(([left], [right]) => left - right)
    .map(([score, count]) => ({
      score,
      count,
      percentage: (count / values.length) * 100,
    }))
}
