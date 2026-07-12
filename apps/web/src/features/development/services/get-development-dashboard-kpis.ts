import type {
  DevelopmentPlanListItem,
} from "../types/development-plan-list-item"

export type DevelopmentDashboardKpis = {
  activePlans: number

  completedPlans: number

  cancelledPlans: number

  averageProgress: number
}

export function calculateDevelopmentDashboardKpis(
  plans: DevelopmentPlanListItem[]
): DevelopmentDashboardKpis {
  const activePlans = plans.filter(
    (item) => item.plan.status === "active"
  ).length

  const completedPlans = plans.filter(
    (item) => item.plan.status === "completed"
  ).length

  const cancelledPlans = plans.filter(
    (item) => item.plan.status === "cancelled"
  ).length

  const plansWithProgress = plans.filter(
    (item) => item.plan.status !== "draft"
  )

  const averageProgress =
    plansWithProgress.length === 0
      ? 0
      : Math.round(
          plansWithProgress.reduce(
            (total, item) => total + item.progress,
            0
          ) / plansWithProgress.length
        )

  return {
    activePlans,
    completedPlans,
    cancelledPlans,
    averageProgress,
  }
}