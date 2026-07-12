import { createServerDatabase } from "@/lib/database/server-database"

import type {
  DevelopmentAction,
} from "../types/development-action"
import type {
  DevelopmentActionType,
} from "../constants/development-action"

type CreateDevelopmentActionInput = {
  companyId: string
  goalId: string
  title: string
  description?: string
  type: DevelopmentActionType
  dueDate?: string
}

type DevelopmentActionRow = {
  id: string
  company_id: string
  goal_id: string
  title: string
  description: string | null
  type: DevelopmentAction["type"]
  status: DevelopmentAction["status"]
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

function mapDevelopmentAction(
  row: DevelopmentActionRow
): DevelopmentAction {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    description: row.description,
    type: row.type,
    status: row.status,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createDevelopmentActionRepository() {
  const supabase = await createServerDatabase()

  return {
    async create(input: CreateDevelopmentActionInput) {
      const { data, error } = await supabase
        .from("development_actions")
        .insert({
          company_id: input.companyId,
          goal_id: input.goalId,
          title: input.title,
          description: input.description || null,
          type: input.type,
          status: "pending",
          due_date: input.dueDate ?? null,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single()

      return {
        data: data
          ? mapDevelopmentAction(
              data as DevelopmentActionRow
            )
          : null,
        error,
      }
    },
  }
}
