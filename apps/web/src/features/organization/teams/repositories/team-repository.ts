import { createServerDatabase } from "@/lib/database/server-database"

type CreateTeamData = {
  companyId: string
  name: string
  description?: string | null
  departmentId?: string | null
  parentTeamId?: string | null
  leaderId?: string | null
}

type UpdateTeamData = {
  companyId: string
  teamId: string
  name: string
  description?: string | null
  departmentId?: string | null
  parentTeamId?: string | null
  leaderId?: string | null
}

export async function createTeamRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("teams")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("name", { ascending: true })
    },

    async findById(companyId: string, teamId: string) {
      return supabase
        .from("teams")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", teamId)
        .is("deleted_at", null)
        .single()
    },

    async create(data: CreateTeamData) {
      return supabase
        .from("teams")
        .insert({
          company_id: data.companyId,
          name: data.name,
          description: data.description ?? null,
          department_id: data.departmentId ?? null,
          parent_team_id: data.parentTeamId ?? null,
          manager_id: data.leaderId ?? null,
        })
        .select("id, name")
        .single()
    },

    async update(data: UpdateTeamData) {
      return supabase
        .from("teams")
        .update({
          name: data.name,
          description: data.description ?? null,
          department_id: data.departmentId ?? null,
          parent_team_id: data.parentTeamId ?? null,
          manager_id: data.leaderId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", data.companyId)
        .eq("id", data.teamId)
        .is("deleted_at", null)
    },

    async archive(companyId: string, teamId: string) {
      return supabase
        .from("teams")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", teamId)
        .is("deleted_at", null)
    },
  }
}
