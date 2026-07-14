export const ASSESSMENT_TEMPLATE_TYPES = [
  "experience",
  "monthly",
  "quarterly",
  "semester",
  "annual",
  "360",
  "leadership",
] as const

export type AssessmentTemplateType =
  (typeof ASSESSMENT_TEMPLATE_TYPES)[number]

export const ASSESSMENT_TEMPLATE_STATUSES = [
  "draft",
  "active",
  "archived",
] as const

export type AssessmentTemplateStatus =
  (typeof ASSESSMENT_TEMPLATE_STATUSES)[number]

export type AssessmentTemplate = {
  id: string
  company_id: string | null

  name: string
  description: string | null
  instructions: string | null

  type: AssessmentTemplateType
  status: AssessmentTemplateStatus
  active: boolean

  created_at: string
  updated_at: string
  deleted_at: string | null
}
