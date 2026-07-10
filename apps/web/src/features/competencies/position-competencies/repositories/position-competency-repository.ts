import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CreatePositionCompetencyInput,
  UpdatePositionCompetencyInput,
} from "../schemas/position-competency-schema"

function normalizeInput(
  input: CreatePositionCompetencyInput | UpdatePositionCompetencyInput
) {
  return {
    position_id: input.positionId,
    competency_id: input.competencyId,
    expected_level: input.expectedLevel,
    weight: input.weight,
    required: input.required,
    type: input.type,
    notes: input.notes || null,
    updated_at: new Date().toISOString(),
  }
}

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
      return supabase.from("position_competencies").insert({
        company_id: companyId,
        ...normalizeInput(input),
      })
    },

    async update(
      companyId: string,
      id: string,
      input: UpdatePositionCompetencyInput
    ) {
      return supabase
        .from("position_competencies")
        .update(normalizeInput(input))
        .eq("company_id", companyId)
        .eq("id", id)
    },

    async archive(companyId: string, id: string) {
      return supabase
        .from("position_competencies")
        .update({
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", id)
    },
  }
}