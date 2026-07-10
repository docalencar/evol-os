import type { TalentCard } from "@/features/talent"

export type EmployeeInsights = {
  talentCard: TalentCard

  biggestGap: string | null

  risk: "low" | "medium" | "high"

  promotionReady: boolean
}
