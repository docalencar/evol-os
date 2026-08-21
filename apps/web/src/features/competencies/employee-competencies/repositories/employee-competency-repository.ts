import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CreateEmployeeCompetencyInput,
  UpdateEmployeeCompetencyInput,
} from "../schemas/employee-competency-schema"

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
      return supabase.rpc("create_tenant_employee_competency_v1", {
        p_company_id: companyId,
        p_employee_id: input.employeeId,
        p_competency_id: input.competencyId,
        p_current_level: input.currentLevel,
        p_source: input.source,
        p_validated_at: input.validatedAt || null,
        p_notes: input.notes || null,
      })
    },

    async update(
      companyId: string,
      id: string,
      input: UpdateEmployeeCompetencyInput
    ) {
      return supabase.rpc("update_tenant_employee_competency_v1", {
        p_company_id: companyId,
        p_employee_competency_id: id,
        p_employee_id: input.employeeId,
        p_competency_id: input.competencyId,
        p_current_level: input.currentLevel,
        p_source: input.source,
        p_validated_at: input.validatedAt || null,
        p_notes: input.notes || null,
      })
    },

    async archive(companyId: string, id: string) {
      return supabase.rpc("archive_tenant_employee_competency_v1", {
        p_company_id: companyId,
        p_employee_competency_id: id,
      })
    },
  }
}
