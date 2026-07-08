import { createServerDatabase } from "@/lib/database/server-database"

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
  }
}