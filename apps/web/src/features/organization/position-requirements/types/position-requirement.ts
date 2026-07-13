export type PositionRequirementCategory =
  | "education"
  | "experience"
  | "certification"
  | "language"
  | "knowledge"
  | "other"

export type PositionRequirement = {
  id: string

  company_id: string

  position_id: string

  category: PositionRequirementCategory

  value: string

  required: boolean

  notes: string | null

  created_at: string

  updated_at: string

  archived_at: string | null
}