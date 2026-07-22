import type {
  SmartIndicatorStatus,
  SmartIndicatorTrend,
} from "../types/smart-indicator"

// Parâmetro inicial de apresentação, centralizado até que o produto
// ofereça metas configuráveis por empresa.
export const SIGNIFICANT_DETERIORATION_PERCENTAGE = 25

type StatusPolicyInput = {
  available: boolean
  lowerIsBetter: boolean
  trend: SmartIndicatorTrend
  relativeVariation: number | null
}

export function getSmartIndicatorStatus({
  available,
  lowerIsBetter,
  trend,
  relativeVariation,
}: StatusPolicyInput): SmartIndicatorStatus {
  if (!available) {
    return "unavailable"
  }

  if (!lowerIsBetter || trend === "stable") {
    return "healthy"
  }

  const deteriorated = trend === "up"

  if (!deteriorated) {
    return "healthy"
  }

  if (
    relativeVariation !== null &&
    relativeVariation >=
      SIGNIFICANT_DETERIORATION_PERCENTAGE
  ) {
    return "critical"
  }

  return "warning"
}
