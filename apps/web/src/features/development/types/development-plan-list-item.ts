import type {
  DevelopmentPlan,
} from "./development-plan"

export type DevelopmentPlanOwnerOption = {
  id: string
  name: string
}

export type DevelopmentPlanListItem = {
  plan: DevelopmentPlan

  employeeName: string

  ownerName: string | null

  templateName: string | null

  progress: number
}

export type DevelopmentPlanListData = {
  plans: DevelopmentPlanListItem[]

  owners: DevelopmentPlanOwnerOption[]
}