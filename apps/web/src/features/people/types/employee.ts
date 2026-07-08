export type EmployeeStatus = "active" | "inactive" | "on_leave" | "terminated"

export type Employee = {
  id: string
  company_id: string
  user_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  hire_date: string | null
  status: EmployeeStatus
  manager_id: string | null
  team_id: string | null
  position_id: string | null
  disc_profile: "D" | "I" | "S" | "C" | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}
