import type {
  DevelopmentPlanStatus,
} from "../constants/development-plan"

export type DevelopmentPlanDistributionItem = {
  status: DevelopmentPlanStatus

  label: string

  count: number

  percentage: number
}

export type DevelopmentPlanDistribution =
  DevelopmentPlanDistributionItem[]
  