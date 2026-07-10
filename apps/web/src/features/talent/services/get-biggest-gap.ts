import type { CompetencyGap } from "../types/competency-gap"

export function getBiggestGap(
  gaps: CompetencyGap[]
): string | null {
  const worstGap = [...gaps].sort(
    (first, second) => first.gap - second.gap
  )[0]

  if (!worstGap || worstGap.gap >= 0) {
    return null
  }

  return worstGap.competencyName
}
