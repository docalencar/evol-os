import type { DevelopmentGoalStatus } from "../constants/development-goal"

export type DevelopmentGoal = {
  id: string

  planId: string

  competencyId: string

  title: string

  description: string | null

  currentLevel: number

  targetLevel: number

  expectedLevel: number

  status: DevelopmentGoalStatus

  createdAt: string

  updatedAt: string
}
