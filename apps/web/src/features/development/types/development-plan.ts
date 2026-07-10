import type {
  DevelopmentPlanPriority,
  DevelopmentPlanStatus,
} from "../constants/development-plan"

export type DevelopmentPlan = {
  id: string

  companyId: string

  employeeId: string

  title: string

  description: string | null

  status: DevelopmentPlanStatus

  priority: DevelopmentPlanPriority

  createdBy: string

  startDate: string | null

  dueDate: string | null

  completedAt: string | null

  createdAt: string

  updatedAt: string
}
