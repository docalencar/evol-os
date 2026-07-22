import type {
  SmartIndicatorTrend,
} from "../types/smart-indicator"

type ComparisonMode = "absolute" | "relative"

export type IndicatorComparison = {
  trend: SmartIndicatorTrend
  variation: number | null
}

export function compareIndicatorValues(
  current: number | null,
  previous: number | null,
  mode: ComparisonMode
): IndicatorComparison {
  if (current === null || previous === null) {
    return { trend: "unavailable", variation: null }
  }

  const difference = current - previous
  const trend: SmartIndicatorTrend =
    difference > 0
      ? "up"
      : difference < 0
        ? "down"
        : "stable"

  if (mode === "absolute") {
    return { trend, variation: difference }
  }

  if (previous === 0) {
    return {
      trend,
      variation: current === 0 ? 0 : null,
    }
  }

  const variation = (difference / previous) * 100

  return {
    trend,
    variation: Number.isFinite(variation)
      ? variation
      : null,
  }
}
