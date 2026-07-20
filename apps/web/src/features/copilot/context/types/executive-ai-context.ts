export type ExecutiveAiContextEntityType =
  | "organization"
  | "department"
  | "team"
  | "position"
  | "employee"

export type ExecutiveAiContextMetric = {
  id: string
  label: string
  value: string
}

export type ExecutiveAiContextInsight = {
  type: string
  title: string
  description: string
}

export type ExecutiveAiContextRecommendation = {
  title: string
  description: string
}

export type ExecutiveAiContextTimelineItem = {
  title: string
  description: string
  occurredAt: string
}

export type ExecutiveAiContext = {
  entityType: ExecutiveAiContextEntityType

  entityId: string

  companyId: string

  title: string

  summary: string

  metrics: ExecutiveAiContextMetric[]

  insights: ExecutiveAiContextInsight[]

  recommendations: ExecutiveAiContextRecommendation[]

  timeline: ExecutiveAiContextTimelineItem[]

  metadata: Record<string, string>
}
