import { createServerDatabase } from "@/lib/database/server-database"

import type { DevelopmentAction } from "../types/development-action"
import type { DevelopmentActionType } from "../constants/development-action"

/**
 * Actions are read and written exclusively through the D-DB1 trusted boundary.
 *
 * `get_authorized_development_actions_v1` resolves the viewer from the session
 * and returns only the plans they may see. `add_development_goal_action_v1`
 * derives company, actor and authority server-side, and refuses a plan whose
 * structure is locked.
 *
 * Execution transitions are NOT here. `start`, `complete` and `skip` each carry
 * a different actor rule — the subject executes, only a manager, responsible
 * owner or administrator may skip, and skipping requires a bounded reason — so
 * they are separate named operations at the boundary rather than one status
 * setter. A repository method that accepted a target status would reintroduce
 * exactly the generic setter D-P0 forbids.
 */

type CreateDevelopmentActionInput = {
  companyId: string
  goalId: string
  title: string
  description?: string
  type: DevelopmentActionType
  dueDate?: string
}

/** Exactly the columns `get_authorized_development_actions_v1` returns. */
type AuthorizedDevelopmentActionRow = {
  action_id: string
  goal_id: string
  plan_id: string
  title: string
  description: string | null
  action_type: DevelopmentAction["type"]
  status: DevelopmentAction["status"]
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

function mapDevelopmentAction(row: AuthorizedDevelopmentActionRow): DevelopmentAction {
  return {
    id: row.action_id,
    goalId: row.goal_id,
    title: row.title,
    description: row.description,
    type: row.action_type,
    status: row.status,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createDevelopmentActionRepository() {
  const supabase = await createServerDatabase()

  async function read(
    companyId: string,
    planId: string | null
  ): Promise<{ data: AuthorizedDevelopmentActionRow[] | null; error: unknown }> {
    const { data, error } = await supabase.rpc("get_authorized_development_actions_v1", {
      p_company_id: companyId,
      p_plan_id: planId,
    })
    return { data: (data ?? null) as AuthorizedDevelopmentActionRow[] | null, error }
  }

  return {
    async findByPlan(companyId: string, planId: string) {
      const { data, error } = await read(companyId, planId)
      return { data: data?.map(mapDevelopmentAction) ?? null, error }
    },

    /**
     * The boundary is keyed on the plan, which is where authority lives; goals
     * are a selector within an already-authorized set. Filtering locally
     * therefore narrows, and cannot widen, what the viewer may see.
     */
    async findByGoalIds(companyId: string, goalIds: string[]) {
      if (goalIds.length === 0) {
        return { data: [] as DevelopmentAction[], error: null }
      }
      const { data, error } = await read(companyId, null)
      const wanted = new Set(goalIds)
      return {
        data: data?.filter((row) => wanted.has(row.goal_id)).map(mapDevelopmentAction) ?? null,
        error,
      }
    },

    async create(input: CreateDevelopmentActionInput) {
      const { data, error } = await supabase.rpc("add_development_goal_action_v1", {
        p_goal_id: input.goalId,
        p_title: input.title,
        p_description: input.description || null,
        p_type: input.type,
        p_due_date: input.dueDate ?? null,
      })
      const actionId = data as string | null
      if (error || !actionId) return { data: null, error }

      // Re-read canonically: `status` and `completed_at` are derived by the
      // boundary, never supplied by the caller.
      const canonical = await read(input.companyId, null)
      if (canonical.error) return { data: null, error: canonical.error }
      const created = canonical.data?.find((row) => row.action_id === actionId) ?? null
      return { data: created ? mapDevelopmentAction(created) : null, error: null }
    },
  }
}
