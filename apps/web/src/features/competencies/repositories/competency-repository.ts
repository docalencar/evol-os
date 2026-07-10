import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CreateCompetencyInput,
  UpdateCompetencyInput,
} from "../schemas/competency-schema"

function normalizeCompetencyInput(
  input: CreateCompetencyInput | UpdateCompetencyInput
) {
  return {
    name: input.name,
    description: input.description || null,
    category: input.category,
    expected_level: input.expectedLevel,
    weight: input.weight,
    active: input.active,
    updated_at: new Date().toISOString(),
  }
}

export async function createCompetencyRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("competencies")
        .select("*")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("name", { ascending: true })
    },

    async findById(companyId: string, competencyId: string) {
      return supabase
        .from("competencies")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", competencyId)
        .single()
    },

    async create(companyId: string, input: CreateCompetencyInput) {
      return supabase.from("competencies").insert({
        company_id: companyId,
        ...normalizeCompetencyInput(input),
      })
    },

    async update(
      companyId: string,
      competencyId: string,
      input: UpdateCompetencyInput
    ) {
      return supabase
        .from("competencies")
        .update(normalizeCompetencyInput(input))
        .eq("company_id", companyId)
        .eq("id", competencyId)
    },

    async archive(companyId: string, competencyId: string) {
      return supabase
        .from("competencies")
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", competencyId)
    },
  }
}
