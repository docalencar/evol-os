import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CreateDevelopmentTemplateInput,
  UpdateDevelopmentTemplateInput,
} from "../schemas/development-template-schema"

function normalizeCreateInput(
  input: CreateDevelopmentTemplateInput
) {
  return {
    name: input.name,
    description: input.description || null,
    suggested_duration_days:
      input.suggestedDurationDays ?? null,
    active: input.active,
    updated_at: new Date().toISOString(),
  }
}

function normalizeUpdateInput(
  input: UpdateDevelopmentTemplateInput
) {
  const normalizedInput: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.name !== undefined) {
    normalizedInput.name = input.name
  }

  if (input.description !== undefined) {
    normalizedInput.description = input.description || null
  }

  if (input.suggestedDurationDays !== undefined) {
    normalizedInput.suggested_duration_days =
      input.suggestedDurationDays
  }

  if (input.active !== undefined) {
    normalizedInput.active = input.active
  }

  return normalizedInput
}

export async function createDevelopmentTemplateRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAll(companyId: string) {
      return supabase
        .from("development_templates")
        .select("*")
        .or(
          `scope.eq.global,and(scope.eq.company,company_id.eq.${companyId})`
        )
        .order("scope", { ascending: true })
        .order("name", { ascending: true })
    },

    async findById(companyId: string, id: string) {
      return supabase
        .from("development_templates")
        .select("*")
        .eq("id", id)
        .or(
          `scope.eq.global,and(scope.eq.company,company_id.eq.${companyId})`
        )
        .single()
    },

    async create(
      companyId: string,
      createdBy: string,
      input: CreateDevelopmentTemplateInput
    ) {
      return supabase
        .from("development_templates")
        .insert({
          company_id: companyId,
          created_by: createdBy,
          scope: "company",
          ...normalizeCreateInput(input),
        })
        .select("*")
        .single()
    },

    async update(
      companyId: string,
      id: string,
      input: UpdateDevelopmentTemplateInput
    ) {
      return supabase
        .from("development_templates")
        .update(normalizeUpdateInput(input))
        .eq("id", id)
        .eq("company_id", companyId)
        .eq("scope", "company")
        .select("*")
        .single()
    },

    async deactivate(companyId: string, id: string) {
      return supabase
        .from("development_templates")
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_id", companyId)
        .eq("scope", "company")
        .select("*")
        .single()
    },
  }
}