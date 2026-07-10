export type CompetencyCategory =
  | "behavioral"
  | "technical"
  | "leadership"

export type Competency = {
  id: string
  company_id: string

  name: string
  description: string | null

  category: CompetencyCategory

  expected_level: number
  weight: number

  active: boolean

  created_at: string
  updated_at: string
}