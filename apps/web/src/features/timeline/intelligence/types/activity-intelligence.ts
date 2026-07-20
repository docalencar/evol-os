import type {
  ActivityTimelineItemViewModel,
} from "../../view-models/activity-timeline-item-view-model"

export type ActivityIntelligencePriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "informational"

export type ActivityIntelligenceCategory =
  | "people"
  | "organization"
  | "leadership"
  | "development"
  | "performance"
  | "engagement"
  | "compliance"
  | "operations"
  | "system"

export type ActivityInsightKind =
  | "alert"
  | "risk"
  | "opportunity"
  | "trend"
  | "recommendation"
  | "summary"

export type ActivityRecommendedActionType =
  | "review"
  | "follow_up"
  | "contact"
  | "assign"
  | "schedule"
  | "update"
  | "investigate"
  | "monitor"
  | "open_entity"

export type ActivityRecommendedAction = {
  id: string
  type: ActivityRecommendedActionType
  label: string
  description: string | null
  href: string | null
  entityType: string | null
  entityId: string | null
}

export type ActivityIntelligenceInsight = {
  id: string
  kind: ActivityInsightKind
  priority: ActivityIntelligencePriority
  category: ActivityIntelligenceCategory
  title: string
  description: string
  reason: string | null
  activityIds: string[]
  entityType: string | null
  entityId: string | null
  subjectType: string | null
  subjectId: string | null
  occurredAt: string
  recommendedActions: ActivityRecommendedAction[]
}

export type ActivityIntelligenceSummary = {
  totalActivities: number
  totalInsights: number
  criticalInsights: number
  highPriorityInsights: number
  mediumPriorityInsights: number
  lowPriorityInsights: number
  informationalInsights: number
  periodStart: string | null
  periodEnd: string | null
  headline: string
  description: string
}

export type ActivityIntelligenceViewModel = {
  summary: ActivityIntelligenceSummary
  insights: ActivityIntelligenceInsight[]
  sourceActivities: ActivityTimelineItemViewModel[]
  generatedAt: string
}
