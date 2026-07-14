export const ASSESSMENT_QUESTION_TYPES = [
  "scale",
  "yes_no",
  "text",
  "number",
] as const

export type AssessmentQuestionType =
  (typeof ASSESSMENT_QUESTION_TYPES)[number]

export type AssessmentQuestion = {
  id: string

  company_id: string

  assessment_section_id: string

  code: string | null

  question: string

  help_text: string | null

  question_type: AssessmentQuestionType

  scale_min: number

  scale_max: number

  weight: number

  display_order: number

  required: boolean

  active: boolean

  created_at: string

  updated_at: string

  deleted_at: string | null
}
