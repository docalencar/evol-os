import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CreateDevelopmentTemplateInput,
  UpdateDevelopmentTemplateInput,
} from "../schemas/development-template-schema"
import type { DevelopmentTemplate } from "../types/development-template"

type DevelopmentTemplateRow = {
  id: string
  company_id: string | null
  name: string
  description: string | null
  scope: "global" | "company"
  suggested_duration_days: number | null
  active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

function mapDevelopmentTemplate(
  row: DevelopmentTemplateRow
): DevelopmentTemplate {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    scope: row.scope,
    suggestedDurationDays:
      row.suggested_duration_days,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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
    normalizedInput.description =
      input.description || null
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
      const { data, error } = await supabase
        .from("development_templates")
        .select("*")
        .or(
          `scope.eq.global,and(scope.eq.company,company_id.eq.${companyId})`
        )
        .eq("active", true)
        .order("scope", { ascending: true })
        .order("name", { ascending: true })

      return {
        data:
          data?.map((row) =>
            mapDevelopmentTemplate(
              row as DevelopmentTemplateRow
            )
          ) ?? null,
        error,
      }
    },

    async findById(companyId: string, id: string) {
      const { data, error } = await supabase
        .from("development_templates")
        .select("*")
        .eq("id", id)
        .or(
          `scope.eq.global,and(scope.eq.company,company_id.eq.${companyId})`
        )
        .single()

      return {
        data: data
          ? mapDevelopmentTemplate(
              data as DevelopmentTemplateRow
            )
          : null,
        error,
      }
    },

    async create(
      companyId: string,
      createdBy: string,
      input: CreateDevelopmentTemplateInput
    ) {
      const { data, error } = await supabase
        .from("development_templates")
        .insert({
          company_id: companyId,
          created_by: createdBy,
          scope: "company",
          ...normalizeCreateInput(input),
        })
        .select("*")
        .single()

      return {
        data: data
          ? mapDevelopmentTemplate(
              data as DevelopmentTemplateRow
            )
          : null,
        error,
      }
    },

    async update(
      companyId: string,
      id: string,
      input: UpdateDevelopmentTemplateInput
    ) {
      const { data, error } = await supabase
        .from("development_templates")
        .update(normalizeUpdateInput(input))
        .eq("id", id)
        .eq("company_id", companyId)
        .eq("scope", "company")
        .eq("active", true)
        .select("*")
        .single()

      return {
        data: data
          ? mapDevelopmentTemplate(
              data as DevelopmentTemplateRow
            )
          : null,
        error,
      }
    },

    async deactivate(companyId: string, id: string) {
      const { data, error } = await supabase
        .from("development_templates")
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_id", companyId)
        .eq("scope", "company")
        .eq("active", true)
        .select("*")
        .single()

      return {
        data: data
          ? mapDevelopmentTemplate(
              data as DevelopmentTemplateRow
            )
          : null,
        error,
      }
    },
  }
}