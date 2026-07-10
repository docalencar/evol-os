import type { CompetencyGap } from "../types/competency-gap"

export function calculateRisk(
  gaps: CompetencyGap[]
): "low" | "medium" | "high" {
  const critical = gaps.filter(
    (gap) => gap.status === "critical"
  ).length

  const attention = gaps.filter(
    (gap) => gap.status === "attention"
  ).length

  if (critical >= 2) {
    return "high"
  }

  if (critical >= 1 || attention >= 3) {
    return "medium"
  }

  return "low"
}
