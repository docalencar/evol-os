import { createServerDatabase } from "@/lib/database/server-database"

export async function createRoleRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("roles")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("title", { ascending: true })
    },

    async findById(companyId: string, roleId: string) {
      return supabase
        .from("roles")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", roleId)
        .is("deleted_at", null)
        .single()
    },
  }
}
