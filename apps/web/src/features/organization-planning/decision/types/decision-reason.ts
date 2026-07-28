export const DECISION_REASON_PRIORITIES = [
  "informational",
  "low",
  "medium",
  "high",
  "critical",
] as const

export type DecisionReasonPriority =
  (typeof DECISION_REASON_PRIORITIES)[number]

export const DECISION_REASON_SOURCES = [
  "executive_summary",
  "structural_impact",
  "span_of_control",
  "position_capacity",
  "critical_risk",
] as const

export type DecisionReasonSource =
  (typeof DECISION_REASON_SOURCES)[number]

export type DecisionReason =
  Readonly<{
    id: string
    priority: DecisionReasonPriority
    source: DecisionReasonSource
    title: string
    description: string
    impact: string
  }>
