export type AssessmentSection = {
  id: string
  company_id: string
  assessment_template_id: string

  code: string | null
  name: string
  description: string | null

  icon: string | null
  color: string | null

  weight: number
  display_order: number
  active: boolean

  created_at: string
  updated_at: string
  deleted_at: string | null
}
