import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CreateDevelopmentTemplateGoalInput,
  UpdateDevelopmentTemplateGoalInput,
} from "../schemas/development-template-goal-schema"

function normalizeCreateInput(
  input: CreateDevelopmentTemplateGoalInput
) {
  return {
    template_id: input.templateId,
    competency_id: input.competencyId,
    description: input.description || null,
    suggested_target_level:
      input.suggestedTargetLevel ?? null,
    order_index: input.orderIndex,
    updated_at: new Date().toISOString(),
  }
}

function normalizeUpdateInput(
  input: UpdateDevelopmentTemplateGoalInput
) {
  const normalized: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.competencyId !== undefined) {
    normalized.competency_id = input.competencyId
  }

  if (input.description !== undefined) {
    normalized.description =
      input.description || null
  }

  if (input.suggestedTargetLevel !== undefined) {
    normalized.suggested_target_level =
      input.suggestedTargetLevel
  }

  if (input.orderIndex !== undefined) {
    normalized.order_index = input.orderIndex
  }

  return normalized
}

export async function createDevelopmentTemplateGoalRepository() {
  const supabase = await createServerDatabase()

  return {
    async findByTemplate(templateId: string) {
      return supabase
        .from("development_template_goals")
        .select(`
          *,
          competencies (
            name
          )
        `)
        .eq("template_id", templateId)
        .order("order_index", {
          ascending: true,
        })
    },

    async findById(id: string) {
      return supabase
        .from("development_template_goals")
        .select(`
          *,
          competencies (
            name
          )
        `)
        .eq("id", id)
        .single()
    },

    async create(
      input: CreateDevelopmentTemplateGoalInput
    ) {
      return supabase
        .from("development_template_goals")
        .insert(normalizeCreateInput(input))
        .select("*")
        .single()
    },

    async update(
      id: string,
      input: UpdateDevelopmentTemplateGoalInput
    ) {
      return supabase
        .from("development_template_goals")
        .update(normalizeUpdateInput(input))
        .eq("id", id)
        .select("*")
        .single()
    },

    async delete(id: string) {
      return supabase
        .from("development_template_goals")
        .delete()
        .eq("id", id)
    },
  }
}
