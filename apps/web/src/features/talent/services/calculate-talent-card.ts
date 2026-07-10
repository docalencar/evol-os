import type { CompetencyGap } from "../types/competency-gap"
import type { TalentCard } from "../types/talent-card"

export function calculateTalentCard(
  gaps: CompetencyGap[]
): TalentCard {
  if (gaps.length === 0) {
    return {
      adherence: 0,
      strengths: 0,
      matched: 0,
      attention: 0,
      critical: 0,
      promotionReady: false,
    }
  }

  let strengths = 0
  let matched = 0
  let attention = 0
  let critical = 0

  for (const gap of gaps) {
    switch (gap.status) {
      case "strength":
        strengths += 1
        break

      case "matched":
        matched += 1
        break

      case "attention":
        attention += 1
        break

      case "critical":
        critical += 1
        break
    }
  }

  const score =
    strengths * 100 +
    matched * 100 +
    attention * 70 +
    critical * 30

  return {
    adherence: Math.round(score / gaps.length),
    strengths,
    matched,
    attention,
    critical,
    promotionReady: critical === 0 && attention <= 1,
  }
}
