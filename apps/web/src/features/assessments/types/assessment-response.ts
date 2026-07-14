export const ASSESSMENT_RESPONSE_STATUSES = [
  "draft",
  "in_progress",
  "submitted",
  "completed",
  "cancelled",
] as const

export type AssessmentResponseStatus =
  (typeof ASSESSMENT_RESPONSE_STATUSES)[number]

export type AssessmentResponse = {
  id: string
  company_id: string
  assessment_cycle_id: string
  assessment_template_id: string
  employee_id: string
  evaluator_id: string
  status: AssessmentResponseStatus
  started_at: string | null
  completed_at: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}
