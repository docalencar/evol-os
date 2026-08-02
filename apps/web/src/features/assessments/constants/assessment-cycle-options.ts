import type {
  AssessmentCycleStatus,
  AssessmentCycleType,
  AssessmentVisibility,
} from "../types/assessment-cycle"

export const ASSESSMENT_CYCLE_TYPE_LABELS: Record<
  AssessmentCycleType,
  string
> = {
  performance: "Desempenho",
  competency: "Competências",
  experience: "Experiência",
  probation: "Período de experiência",
  "360": "Avaliação 360°",
  custom: "Personalizada",
}

export const ASSESSMENT_CYCLE_STATUS_LABELS: Record<
  AssessmentCycleStatus,
  string
> = {
  draft: "Rascunho",
  scheduled: "Agendado",
  active: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
}

export const assessmentCycleTypeOptions = Object.entries(
  ASSESSMENT_CYCLE_TYPE_LABELS
).map(([value, label]) => ({
  value: value as AssessmentCycleType,
  label,
}))

export const assessmentCycleStatusOptions = Object.entries(
  ASSESSMENT_CYCLE_STATUS_LABELS
).map(([value, label]) => ({
  value: value as AssessmentCycleStatus,
  label,
}))

export const ASSESSMENT_VISIBILITY_LABELS: Record<
  AssessmentVisibility,
  string
> = {
  none: "Sem acesso aos resultados",
  score: "Somente nota geral",
  score_and_competencies: "Nota e competências",
  score_and_comments: "Nota e comentários",
  full: "Resultado completo",
}

export const assessmentVisibilityOptions = Object.entries(
  ASSESSMENT_VISIBILITY_LABELS
).map(([value, label]) => ({
  value: value as AssessmentVisibility,
  label,
}))
