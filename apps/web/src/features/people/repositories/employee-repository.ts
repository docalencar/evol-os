import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "../schemas/employee-schema"

function normalizeEmployeeInput(
  input: CreateEmployeeInput | UpdateEmployeeInput
) {
  return {
    full_name: input.fullName,
    email: input.email || null,
    phone: input.phone || null,
    birth_date: input.birthDate || null,
    hire_date: input.hireDate || null,
    status: input.status,
    team_id: input.teamId || null,
    position_id: input.positionId || null,
    manager_id: input.managerId || null,
    disc_profile: input.discProfile || null,
    updated_at: new Date().toISOString(),
  }
}

export async function createEmployeeRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("people")
        .select(`
          *,
          teams!people_team_id_fkey(name),
          positions(name)
        `)
        .eq("company_id", companyId)
        .neq("status", "terminated")
        .order("full_name", { ascending: true })
    },

    async findById(companyId: string, employeeId: string) {
      return supabase
        .from("people")
        .select(`
          *,
          teams!people_team_id_fkey(name),
          positions(name)
        `)
        .eq("company_id", companyId)
        .eq("id", employeeId)
        .neq("status", "terminated")
        .single()
    },

    async create(companyId: string, input: CreateEmployeeInput) {
      return supabase.from("people").insert({
        company_id: companyId,
        ...normalizeEmployeeInput(input),
      })
    },

    async update(
      companyId: string,
      employeeId: string,
      input: UpdateEmployeeInput
    ) {
      return supabase
        .from("people")
        .update(normalizeEmployeeInput(input))
        .eq("company_id", companyId)
        .eq("id", employeeId)
        .neq("status", "terminated")
    },

    async archive(companyId: string, employeeId: string) {
      return supabase
        .from("people")
        .update({
          status: "terminated",
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", employeeId)
        .neq("status", "terminated")
    },
  }
}