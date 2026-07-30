import type { ExecutiveDashboardViewModel } from "../executive-dashboard"
import type { PlanningTimelineViewModel } from "../timeline"

export type ExecutiveNavigationViewModel = Readonly<{
  dashboard: ExecutiveDashboardViewModel
  timeline: PlanningTimelineViewModel
}>
