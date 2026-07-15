import { createServerDatabase } from "@/lib/database/server-database"

type CreateDepartmentData = {
  companyId: string
  name: string
  description?: string | null
  leaderId?: string | null
}

type UpdateDepartmentData = {
  companyId: string
  departmentId: string
  name: string
  description?: string | null
  leaderId?: string | null
}

export async function createDepartmentRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("departments")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("name", { ascending: true })
    },

    async findById(
      companyId: string,
      departmentId: string
    ) {
      return supabase
        .from("departments")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", departmentId)
        .is("deleted_at", null)
        .single()
    },

    async create(data: CreateDepartmentData) {
      return supabase
        .from("departments")
        .insert({
          company_id: data.companyId,
          name: data.name,
          description: data.description ?? null,
          manager_id: data.leaderId ?? null,
        })
        .select("id, name")
        .single()
    },

    async update(data: UpdateDepartmentData) {
      return supabase
        .from("departments")
        .update({
          name: data.name,
          description: data.description ?? null,
          manager_id: data.leaderId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", data.companyId)
        .eq("id", data.departmentId)
        .is("deleted_at", null)
    },

    async archive(
      companyId: string,
      departmentId: string
    ) {
      return supabase
        .from("departments")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", departmentId)
        .is("deleted_at", null)
    },
  }
}
