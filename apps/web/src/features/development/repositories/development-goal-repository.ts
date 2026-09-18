import { createServerDatabase } from "@/lib/database/server-database"

import type { DevelopmentGoal } from "../types/development-goal"

/**
 * Goals are read and written exclusively through the D-DB1 trusted boundary.
 *
 * Reads go through `get_authorized_development_goals_v1`, which resolves the
 * viewer from the session and returns only the plans they may see — the subject,
 * their current manager, the explicit responsible owner, and company
 * administrators. Filtering by `company_id` in the client, as this repository
 * used to, decided nothing: it selected a tenant and left the privacy question
 * to RLS on a table whose read policy predates the frozen D-P0 contract.
 *
 * Writes go through `add_development_plan_goal_v1`, which derives company,
 * actor and authority server-side and refuses a plan whose structure is locked.
 * There is deliberately no update and no delete here: D-P0 gives no actor a
 * structural edit of a goal after activation, and a repository method is not
 * the place to invent one.
 */

type CreateDevelopmentGoalInput = {
  companyId: string
  planId: string
  competencyId: string
  title: string
  description?: string
  currentLevel: number
  expectedLevel: number
  targetLevel: number
}

/** Exactly the columns `get_authorized_development_goals_v1` returns. */
type AuthorizedDevelopmentGoalRow = {
  goal_id: string
  plan_id: string
  competency_id: string
  title: string
  description: string | null
  current_level: number
  expected_level: number
  target_level: number
  status: DevelopmentGoal["status"]
  created_at: string
  updated_at: string
}

function mapDevelopmentGoal(row: AuthorizedDevelopmentGoalRow): DevelopmentGoal {
  return {
    id: row.goal_id,
    planId: row.plan_id,
    competencyId: row.competency_id,
    title: row.title,
    description: row.description,
    currentLevel: row.current_level,
    expectedLevel: row.expected_level,
    targetLevel: row.target_level,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createDevelopmentGoalRepository() {
  const supabase = await createServerDatabase()

  // The client has no generated Database types, so `rpc` widens `data` to
  // `any`. Narrowing once here keeps every call site typed.
  async function read(
    companyId: string,
    planId: string | null
  ): Promise<{ data: AuthorizedDevelopmentGoalRow[] | null; error: unknown }> {
    const { data, error } = await supabase.rpc("get_authorized_development_goals_v1", {
      p_company_id: companyId,
      p_plan_id: planId,
    })
    return { data: (data ?? null) as AuthorizedDevelopmentGoalRow[] | null, error }
  }

  return {
    async findByPlan(companyId: string, planId: string) {
      const { data, error } = await read(companyId, planId)
      return { data: data?.map(mapDevelopmentGoal) ?? null, error }
    },

    /**
     * One authorized read, then a local partition. The boundary already scoped
     * the rows to what this viewer may see, so selecting a subset of plan ids
     * from that set cannot widen it — and asking the database once per plan
     * would multiply round trips without adding a single authority check.
     */
    async findByPlanIds(companyId: string, planIds: string[]) {
      if (planIds.length === 0) {
        return { data: [] as DevelopmentGoal[], error: null }
      }
      const { data, error } = await read(companyId, null)
      const wanted = new Set(planIds)
      return {
        data: data?.filter((row) => wanted.has(row.plan_id)).map(mapDevelopmentGoal) ?? null,
        error,
      }
    },

    async create(input: CreateDevelopmentGoalInput) {
      const { data, error } = await supabase.rpc("add_development_plan_goal_v1", {
        p_plan_id: input.planId,
        p_competency_id: input.competencyId,
        p_title: input.title,
        p_description: input.description || null,
        p_current_level: input.currentLevel,
        p_expected_level: input.expectedLevel,
        p_target_level: input.targetLevel,
      })
      const goalId = data as string | null
      if (error || !goalId) return { data: null, error }

      // Re-read through the same authorized boundary rather than trusting the
      // values just sent: `status` is derived, not supplied, and the canonical
      // row is what the caller must see.
      const canonical = await read(input.companyId, input.planId)
      if (canonical.error) return { data: null, error: canonical.error }
      const created = canonical.data?.find((row) => row.goal_id === goalId) ?? null
      return { data: created ? mapDevelopmentGoal(created) : null, error: null }
    },
  }
}
