import { createServerDatabase } from "@/lib/database/server-database"

export async function createEmployeeRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("employees")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
    },

    async findById(companyId: string, employeeId: string) {
      return supabase
        .from("employees")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", employeeId)
        .is("deleted_at", null)
        .single()
    },
  }
}
