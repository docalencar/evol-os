import { createServerDatabase } from "@/lib/database/server-database"

type CreatePositionData = {
  companyId: string
  name: string
  description?: string | null
}

type UpdatePositionData = {
  companyId: string
  positionId: string
  name: string
  description?: string | null
}

export async function createPositionRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("positions")
        .select("*")
        .eq("company_id", companyId)
        .order("name", { ascending: true })
    },

    async findById(companyId: string, positionId: string) {
      return supabase
        .from("positions")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", positionId)
        .single()
    },

    async create(data: CreatePositionData) {
      return supabase.from("positions").insert({
        company_id: data.companyId,
        name: data.name,
        description: data.description ?? null,
      })
    },

    async update(data: UpdatePositionData) {
      return supabase
        .from("positions")
        .update({
          name: data.name,
          description: data.description ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", data.companyId)
        .eq("id", data.positionId)
        .is("deleted_at", null)
    },

    async archive(companyId: string, positionId: string) {
      return supabase
        .from("positions")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", positionId)
        .is("deleted_at", null)
    },
  }
}