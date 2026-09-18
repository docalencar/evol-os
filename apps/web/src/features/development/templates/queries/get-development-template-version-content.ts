import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

/**
 * The goals and actions of one template version, for the authoring surface.
 *
 * These are the same 0132 readers the deterministic resolver uses, called with
 * no employee: that argument exists for the manager branch, and an
 * administrative actor authorizes on their own membership. A non-administrative
 * caller gets empty sets here, exactly as they would for a version that does
 * not exist.
 */

export type DevelopmentTemplateVersionGoal = Readonly<{
  templateVersionGoalId: string
  competencyId: string
  description: string | null
  suggestedTargetLevel: number | null
  orderIndex: number
}>

export type DevelopmentTemplateVersionAction = Readonly<{
  templateVersionActionId: string
  templateVersionGoalId: string
  title: string
  description: string | null
  type: string
  suggestedDueDays: number | null
  orderIndex: number
}>

type GoalRow = {
  id: string
  competency_id: string
  description: string | null
  suggested_target_level: number | null
  order_index: number
}

type ActionRow = {
  id: string
  template_version_goal_id: string
  title: string
  description: string | null
  type: string
  suggested_due_days: number | null
  order_index: number
}

export async function getDevelopmentTemplateVersionContent(
  templateVersionId: string
): Promise<{
  goals: DevelopmentTemplateVersionGoal[]
  actions: DevelopmentTemplateVersionAction[]
}> {
  const database = await createServerDatabase()
  const parameters = { p_version_id: templateVersionId, p_employee_id: null }

  const [goalResult, actionResult] = await Promise.all([
    database.rpc("get_development_template_version_goals_v1", parameters),
    database.rpc("get_development_template_version_actions_v1", parameters),
  ])
  if (goalResult.error) throw goalResult.error
  if (actionResult.error) throw actionResult.error

  return {
    goals: ((goalResult.data ?? []) as GoalRow[]).map((row) => ({
      templateVersionGoalId: row.id,
      competencyId: row.competency_id,
      description: row.description,
      suggestedTargetLevel: row.suggested_target_level,
      orderIndex: row.order_index,
    })),
    actions: ((actionResult.data ?? []) as ActionRow[]).map((row) => ({
      templateVersionActionId: row.id,
      templateVersionGoalId: row.template_version_goal_id,
      title: row.title,
      description: row.description,
      type: row.type,
      suggestedDueDays: row.suggested_due_days,
      orderIndex: row.order_index,
    })),
  }
}
