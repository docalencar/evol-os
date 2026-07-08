export type RoleLevel = "intern" | "junior" | "mid" | "senior" | "lead" | "manager" | "director"

export type Role = {
  id: string
  companyId: string
  title: string
  description: string | null
  level: RoleLevel | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
