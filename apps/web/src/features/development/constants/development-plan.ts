export const DEVELOPMENT_PLAN_STATUSES = [
  "draft",
  "active",
  "completed",
  "cancelled",
] as const

export type DevelopmentPlanStatus =
  (typeof DEVELOPMENT_PLAN_STATUSES)[number]

export const DEVELOPMENT_PLAN_PRIORITIES = [
  "low",
  "medium",
  "high",
] as const

export type DevelopmentPlanPriority =
  (typeof DEVELOPMENT_PLAN_PRIORITIES)[number]

export const DEVELOPMENT_PLAN_STATUS_LABELS: Record<
  DevelopmentPlanStatus,
  string
> = {
  draft: "Rascunho",
  active: "Ativo",
  completed: "Concluído",
  cancelled: "Cancelado",
}

export const DEVELOPMENT_PLAN_PRIORITY_LABELS: Record<
  DevelopmentPlanPriority,
  string
> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
}
