import type {
  PeopleAnalyticsDashboard,
  PeopleAnalyticsDashboardViewModel,
} from "../types/people-analytics-dashboard"

const integerFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
})

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
})

export function presentPeopleAnalyticsDashboard(
  dashboard: PeopleAnalyticsDashboard
): PeopleAnalyticsDashboardViewModel {
  const occupancy = dashboard.organizationOccupancy

  return {
    headcount: integerFormatter.format(dashboard.headcount),
    openJobs: integerFormatter.format(dashboard.openJobs),
    pendingApprovals: integerFormatter.format(
      dashboard.pendingApprovals
    ),
    organizationOccupancy: {
      current: integerFormatter.format(occupancy.current),
      ideal: integerFormatter.format(occupancy.ideal),
      difference: integerFormatter.format(
        occupancy.difference
      ),
      percentage:
        occupancy.percentage === null
          ? "Indisponível"
          : `${percentageFormatter.format(
              occupancy.percentage
            )}%`,
      isAvailable: occupancy.percentage !== null,
    },
    isEmpty:
      dashboard.headcount === 0 &&
      dashboard.openJobs === 0 &&
      dashboard.pendingApprovals === 0 &&
      occupancy.current === 0 &&
      occupancy.ideal === 0,
  }
}
