import type { DiscProfile } from "../constants/disc-profile"

export type EmployeeStatus =
  "active" | "inactive" | "on_leave" | "terminated"

export type Employee = {
  id: string
  company_id: string
  user_id?: string | null
  has_user_access?: boolean
  full_name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  hire_date: string | null
  status: EmployeeStatus
  manager_id: string | null
  team_id: string | null
  position_id: string | null
  // Assigned seniority profile of the position (v3 read). Null for a base
  // assignment. The label resolves even when the profile/seniority is archived.
  position_seniority_profile_id?: string | null
  seniority_level_id?: string | null
  seniority_code?: string | null
  seniority_label?: string | null
  disc_profile: DiscProfile | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}
