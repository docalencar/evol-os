import type { CompetencyGap } from "@/features/talent"

export function getBiggestGap(
  gaps: CompetencyGap[]
): string | null {
  const worst = [...gaps]
    .sort((a, b) => a.gap - b.gap)[0]

  if (!worst || worst.gap >= 0) {
    return null
  }

  return worst.competencyName
}
