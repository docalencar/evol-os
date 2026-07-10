export type PositionCompetencyType =
  | "core"
  | "leadership"
  | "promotion"
  | "optional"

export type PositionCompetency = {
  id: string
  company_id: string
  position_id: string
  competency_id: string
  expected_level: number
  weight: number
  required: boolean
  type: PositionCompetencyType
  notes: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}
