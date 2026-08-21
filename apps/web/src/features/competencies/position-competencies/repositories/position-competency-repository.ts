import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CreatePositionCompetencyInput,
  UpdatePositionCompetencyInput,
} from "../schemas/position-competency-schema"

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

    async create(companyId: string, input: CreatePositionCompetencyInput) {
      return supabase.rpc("create_tenant_position_competency_v1", {
        p_company_id: companyId,
        p_position_id: input.positionId,
        p_competency_id: input.competencyId,
        p_expected_level: input.expectedLevel,
        p_weight: input.weight,
        p_required: input.required,
        p_type: input.type,
        p_notes: input.notes || null,
      })
    },

    async update(
      companyId: string,
      id: string,
      input: UpdatePositionCompetencyInput
    ) {
      return supabase.rpc("update_tenant_position_competency_v1", {
        p_company_id: companyId,
        p_position_competency_id: id,
        p_position_id: input.positionId,
        p_competency_id: input.competencyId,
        p_expected_level: input.expectedLevel,
        p_weight: input.weight,
        p_required: input.required,
        p_type: input.type,
        p_notes: input.notes || null,
      })
    },

    async archive(companyId: string, id: string) {
      return supabase.rpc("archive_tenant_position_competency_v1", {
        p_company_id: companyId,
        p_position_competency_id: id,
      })
    },
  }
}
