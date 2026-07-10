import type {
  DevelopmentActionStatus,
  DevelopmentActionType,
} from "../constants/development-action"

export type DevelopmentAction = {
  id: string

  goalId: string

  title: string

  description: string | null

  type: DevelopmentActionType

  status: DevelopmentActionStatus

  dueDate: string | null

  completedAt: string | null

  createdAt: string

  updatedAt: string
}
