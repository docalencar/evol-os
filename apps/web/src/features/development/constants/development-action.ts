export const DEVELOPMENT_ACTION_TYPES = [
  "course",
  "book",
  "mentoring",
  "shadowing",
  "project",
  "workshop",
  "feedback",
  "other",
] as const

export type DevelopmentActionType =
  (typeof DEVELOPMENT_ACTION_TYPES)[number]

export const DEVELOPMENT_ACTION_TYPE_LABELS: Record<
  DevelopmentActionType,
  string
> = {
  course: "Curso",
  book: "Livro",
  mentoring: "Mentoria",
  shadowing: "Shadowing",
  project: "Projeto",
  workshop: "Workshop",
  feedback: "Feedback",
  other: "Outro",
}

export const DEVELOPMENT_ACTION_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "skipped",
] as const

export type DevelopmentActionStatus =
  (typeof DEVELOPMENT_ACTION_STATUSES)[number]

export const DEVELOPMENT_ACTION_STATUS_LABELS: Record<
  DevelopmentActionStatus,
  string
> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  skipped: "Ignorada",
}
