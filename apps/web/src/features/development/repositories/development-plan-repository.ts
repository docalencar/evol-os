import { createServerDatabase } from "@/lib/database/server-database"

export async function createDevelopmentPlanRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("development_plans")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
    },

    async findByEmployee(companyId: string, employeeId: string) {
      return supabase
        .from("development_plans")
        .select("*")
        .eq("company_id", companyId)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
    },

    async findById(companyId: string, planId: string) {
      return supabase
        .from("development_plans")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", planId)
        .single()
    },
  }
}
