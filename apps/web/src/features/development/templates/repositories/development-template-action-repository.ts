import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CreateDevelopmentTemplateActionInput,
  UpdateDevelopmentTemplateActionInput,
} from "../schemas/development-template-action-schema"
import type { DevelopmentTemplateAction } from "../types/development-template-action"

type DevelopmentTemplateActionRow = {
  id: string
  template_goal_id: string
  title: string
  description: string | null
  type: DevelopmentTemplateAction["type"]
  suggested_due_days: number | null
  order_index: number
  created_at: string
  updated_at: string
}

function mapDevelopmentTemplateAction(
  row: DevelopmentTemplateActionRow
): DevelopmentTemplateAction {
  return {
    id: row.id,
    templateGoalId: row.template_goal_id,
    title: row.title,
    description: row.description,
    type: row.type,
    suggestedDueDays: row.suggested_due_days,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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

function mapRows(
  rows: DevelopmentTemplateActionRow[] | null
) {
  return (
    rows?.map((row) =>
      mapDevelopmentTemplateAction(row)
    ) ?? null
  )
}

export async function createDevelopmentTemplateActionRepository() {
  const supabase = await createServerDatabase()

  return {
    async findByGoal(templateGoalId: string) {
      const { data, error } = await supabase
        .from("development_template_actions")
        .select("*")
        .eq("template_goal_id", templateGoalId)
        .order("order_index", {
          ascending: true,
        })

      return {
        data: mapRows(
          data as DevelopmentTemplateActionRow[] | null
        ),
        error,
      }
    },

    async findByGoalIds(templateGoalIds: string[]) {
      if (templateGoalIds.length === 0) {
        return {
          data: [] as DevelopmentTemplateAction[],
          error: null,
        }
      }

      const { data, error } = await supabase
        .from("development_template_actions")
        .select("*")
        .in("template_goal_id", templateGoalIds)
        .order("template_goal_id", {
          ascending: true,
        })
        .order("order_index", {
          ascending: true,
        })

      return {
        data: mapRows(
          data as DevelopmentTemplateActionRow[] | null
        ),
        error,
      }
    },

    async findById(id: string) {
      const { data, error } = await supabase
        .from("development_template_actions")
        .select("*")
        .eq("id", id)
        .single()

      return {
        data: data
          ? mapDevelopmentTemplateAction(
              data as DevelopmentTemplateActionRow
            )
          : null,
        error,
      }
    },

    async create(
      input: CreateDevelopmentTemplateActionInput
    ) {
      const { data, error } = await supabase
        .from("development_template_actions")
        .insert(normalizeCreateInput(input))
        .select("*")
        .single()

      return {
        data: data
          ? mapDevelopmentTemplateAction(
              data as DevelopmentTemplateActionRow
            )
          : null,
        error,
      }
    },

    async update(
      id: string,
      input: UpdateDevelopmentTemplateActionInput
    ) {
      const { data, error } = await supabase
        .from("development_template_actions")
        .update(normalizeUpdateInput(input))
        .eq("id", id)
        .select("*")
        .single()

      return {
        data: data
          ? mapDevelopmentTemplateAction(
              data as DevelopmentTemplateActionRow
            )
          : null,
        error,
      }
    },

    async delete(id: string) {
      return supabase
        .from("development_template_actions")
        .delete()
        .eq("id", id)
    },
  }
}
