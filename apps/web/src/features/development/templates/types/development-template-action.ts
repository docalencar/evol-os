import type { DevelopmentActionType } from "../../constants/development-action"

export type DevelopmentTemplateAction = {
  id: string

  templateGoalId: string

  title: string

  description: string | null

  type: DevelopmentActionType

  suggestedDueDays: number | null

  orderIndex: number

  createdAt: string

  updatedAt: string
}
