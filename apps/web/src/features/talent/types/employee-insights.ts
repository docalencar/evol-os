import type { TalentCard } from "./talent-card"

export type EmployeeInsights = {
  talentCard: TalentCard
  biggestGap: string | null
  risk: "low" | "medium" | "high"
  promotionReady: boolean
}
