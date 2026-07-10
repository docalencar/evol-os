export const DEVELOPMENT_GOAL_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const

export type DevelopmentGoalStatus =
  (typeof DEVELOPMENT_GOAL_STATUSES)[number]

export const DEVELOPMENT_GOAL_STATUS_LABELS: Record<
  DevelopmentGoalStatus,
  string
> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  completed: "Concluído",
}