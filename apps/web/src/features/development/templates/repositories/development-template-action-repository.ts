import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CreateDevelopmentTemplateActionInput,
  UpdateDevelopmentTemplateActionInput,
} from "../schemas/development-template-action-schema"

function normalizeCreateInput(
  input: CreateDevelopmentTemplateActionInput
) {
  return {
    template_goal_id: input.templateGoalId,
    title: input.title,
    description: input.description || null,
    type: input.type,
    suggested_due_days:
      input.suggestedDueDays ?? null,
    order_index: input.orderIndex,
    updated_at: new Date().toISOString(),
  }
}

function normalizeUpdateInput(
  input: UpdateDevelopmentTemplateActionInput
) {
  const normalized: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) {
    normalized.title = input.title
  }

  if (input.description !== undefined) {
    normalized.description =
      input.description || null
  }

  if (input.type !== undefined) {
    normalized.type = input.type
  }

  if (input.suggestedDueDays !== undefined) {
    normalized.suggested_due_days =
      input.suggestedDueDays
  }

  if (input.orderIndex !== undefined) {
    normalized.order_index = input.orderIndex
  }

  return normalized
}

export async function createDevelopmentTemplateActionRepository() {
  const supabase = await createServerDatabase()

  return {
    async findByGoal(templateGoalId: string) {
      return supabase
        .from("development_template_actions")
        .select("*")
        .eq("template_goal_id", templateGoalId)
        .order("order_index", {
          ascending: true,
        })
    },

    async findById(id: string) {
      return supabase
        .from("development_template_actions")
        .select("*")
        .eq("id", id)
        .single()
    },

    async create(
      input: CreateDevelopmentTemplateActionInput
    ) {
      return supabase
        .from("development_template_actions")
        .insert(normalizeCreateInput(input))
        .select("*")
        .single()
    },

    async update(
      id: string,
      input: UpdateDevelopmentTemplateActionInput
    ) {
      return supabase
        .from("development_template_actions")
        .update(normalizeUpdateInput(input))
        .eq("id", id)
        .select("*")
        .single()
    },

    async delete(id: string) {
      return supabase
        .from("development_template_actions")
        .delete()
        .eq("id", id)
    },
  }
}
