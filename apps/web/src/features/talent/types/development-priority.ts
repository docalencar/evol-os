import type { Employee } from "@/features/people"

export type DevelopmentPriorityRisk =
  | "low"
  | "medium"
  | "high"

export type DevelopmentPriority = {
  employeeId: string

  employeeName: string

  risk: DevelopmentPriorityRisk

  criticalGaps: number

  attentionGaps: number

  biggestGap: string | null
}