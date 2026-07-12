import { createServerDatabase } from "@/lib/database/server-database"

import type { DevelopmentGoal } from "../types/development-goal"

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

type DevelopmentGoalRow = {
  id: string
  company_id: string
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

function mapDevelopmentGoal(
  row: DevelopmentGoalRow
): DevelopmentGoal {
  return {
    id: row.id,
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

  return {
    async create(input: CreateDevelopmentGoalInput) {
      const { data, error } = await supabase
        .from("development_goals")
        .insert({
          company_id: input.companyId,
          plan_id: input.planId,
          competency_id: input.competencyId,
          title: input.title,
          description: input.description || null,
          current_level: input.currentLevel,
          expected_level: input.expectedLevel,
          target_level: input.targetLevel,
          status: "not_started",
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single()

      return {
        data: data
          ? mapDevelopmentGoal(
              data as DevelopmentGoalRow
            )
          : null,
        error,
      }
    },
  }
}