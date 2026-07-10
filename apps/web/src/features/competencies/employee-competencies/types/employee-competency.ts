export type EmployeeCompetencySource =
  | "manual"
  | "assessment"
  | "manager"
  | "self"

export type EmployeeCompetency = {
  id: string

  company_id: string
  employee_id: string
  competency_id: string

  current_level: number

  source: EmployeeCompetencySource

  validated_at: string | null

  notes: string | null

  created_at: string
  updated_at: string
  archived_at: string | null
}
