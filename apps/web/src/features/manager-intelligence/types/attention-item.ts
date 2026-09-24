export const ATTENTION_PRIORITIES = ["high", "medium", "low"] as const

export type AttentionPriority =
  (typeof ATTENTION_PRIORITIES)[number]

export const ATTENTION_REASON_TYPES = [
  "assigned_assessment_overdue",
  "assigned_assessment_pending",
  "formal_feedback_pending",
  "development_follow_up_overdue",
  "development_follow_up_due",
  "development_plan_missing",
] as const

export type AttentionReasonType =
  (typeof ATTENTION_REASON_TYPES)[number]

export type AttentionSourceType =
  | "assessment_response"
  | "development_plan"
  | "development_subject"

export type AttentionItem = {
  subjectId: string
  subjectName: string
  subjectStatus: "active" | "on_leave"
  reason: AttentionReasonType
  priority: AttentionPriority
  sourceType: AttentionSourceType
  sourceId: string
  sourceStatus: string
  dueDate: string | null
  sourceVersion: number | null
  sourceUpdatedAt: string | null
}
