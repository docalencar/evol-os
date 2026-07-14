import type {
  AssessmentCycleStatus,
  AssessmentCycleType,
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