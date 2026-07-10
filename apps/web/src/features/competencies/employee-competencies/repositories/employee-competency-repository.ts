import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CreateEmployeeCompetencyInput,
  UpdateEmployeeCompetencyInput,
} from "../schemas/employee-competency-schema"

function normalizeInput(
  input: CreateEmployeeCompetencyInput | UpdateEmployeeCompetencyInput
) {
  return {
    employee_id: input.employeeId,
    competency_id: input.competencyId,
    current_level: input.currentLevel,
    source: input.source,
    validated_at: input.validatedAt || null,
    notes: input.notes || null,
    updated_at: new Date().toISOString(),
  }
}

export async function createEmployeeCompetencyRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAll(companyId: string) {
      return supabase
        .from("employee_competencies")
        .select("*, competencies(name)")
        .eq("company_id", companyId)
        .is("archived_at", null)
        .order("created_at", { ascending: true })
    },

    async findByEmployee(companyId: string, employeeId: string) {
      return supabase
        .from("employee_competencies")
        .select("*, competencies(name)")
        .eq("company_id", companyId)
        .eq("employee_id", employeeId)
        .is("archived_at", null)
        .order("created_at", { ascending: true })
    },

    async findById(companyId: string, id: string) {
      return supabase
        .from("employee_competencies")
        .select("*, competencies(name)")
        .eq("company_id", companyId)
        .eq("id", id)
        .single()
    },

    async create(companyId: string, input: CreateEmployeeCompetencyInput) {
      return supabase.from("employee_competencies").insert({
        company_id: companyId,
        ...normalizeInput(input),
      })
    },

    async update(
      companyId: string,
      id: string,
      input: UpdateEmployeeCompetencyInput
    ) {
      return supabase
        .from("employee_competencies")
        .update(normalizeInput(input))
        .eq("company_id", companyId)
        .eq("id", id)
    },

    async archive(companyId: string, id: string) {
      return supabase
        .from("employee_competencies")
        .update({
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", id)
    },
  }
}
