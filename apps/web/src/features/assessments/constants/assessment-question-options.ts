import {
  ASSESSMENT_QUESTION_TYPES,
} from "../types/assessment-question"

export const ASSESSMENT_QUESTION_TYPE_LABELS: Record<
  (typeof ASSESSMENT_QUESTION_TYPES)[number],
  string
> = {
  scale: "Escala",

  yes_no: "Sim / Não",

  text: "Texto",

  number: "Número",
}

export const assessmentQuestionTypeOptions =
  ASSESSMENT_QUESTION_TYPES.map((type) => ({
    value: type,
    label: ASSESSMENT_QUESTION_TYPE_LABELS[type],
  }))
