export const ATTENTION_PRIORITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const

export type AttentionPriority =
  (typeof ATTENTION_PRIORITIES)[number]

export const ATTENTION_REASON_TYPES = [
  "health-score",
  "assessment-overdue",
  "missing-development-plan",
  "critical-competency",
  "recognition",
] as const

export type AttentionReasonType =
  (typeof ATTENTION_REASON_TYPES)[number]

export type AttentionItem = {
  employeeId: string
  employeeName: string
  positionName: string | null
  departmentName: string | null
  priority: AttentionPriority
  reasonType: AttentionReasonType
  reason: string
  recommendedAction: string
  healthScore: number | null
  updatedAt: string | null
}
