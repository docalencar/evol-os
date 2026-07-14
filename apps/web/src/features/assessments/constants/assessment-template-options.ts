import type {
  AssessmentTemplateStatus,
  AssessmentTemplateType,
} from "../types/assessment-template"

export const ASSESSMENT_TEMPLATE_TYPE_LABELS: Record<
  AssessmentTemplateType,
  string
> = {
  experience: "Experiência",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semester: "Semestral",
  annual: "Anual",
  "360": "Avaliação 360°",
  leadership: "Liderança",
}

export const ASSESSMENT_TEMPLATE_STATUS_LABELS: Record<
  AssessmentTemplateStatus,
  string
> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
}

export const assessmentTemplateTypeOptions = Object.entries(
  ASSESSMENT_TEMPLATE_TYPE_LABELS
).map(([value, label]) => ({
  value: value as AssessmentTemplateType,
  label,
}))

export const assessmentTemplateStatusOptions = Object.entries(
  ASSESSMENT_TEMPLATE_STATUS_LABELS
).map(([value, label]) => ({
  value: value as AssessmentTemplateStatus,
  label,
}))
