import { createServerDatabase } from "@/lib/database/server-database"

export async function createPositionCompetencyRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAll(companyId: string) {
      return supabase
        .from("position_competencies")
        .select("*, competencies(name)")
        .eq("company_id", companyId)
        .is("archived_at", null)
        .order("created_at", { ascending: true })
    },

    async findByPosition(companyId: string, positionId: string) {
      return supabase
        .from("position_competencies")
        .select("*, competencies(name)")
        .eq("company_id", companyId)
        .eq("position_id", positionId)
        .is("archived_at", null)
        .order("created_at", { ascending: true })
    },

    async findById(companyId: string, id: string) {
      return supabase
        .from("position_competencies")
        .select("*, competencies(name)")
        .eq("company_id", companyId)
        .eq("id", id)
        .single()
    },
  }
}
