import "server-only"

import { createExecutiveDashboardService } from "../executive-dashboard"
import { createPlanningTimelineService } from "../timeline"
import { ExecutiveNavigationService } from "./executive-navigation-service"

export async function createExecutiveNavigationService(companyId: string): Promise<ExecutiveNavigationService> {
  const [dashboard, timeline] = await Promise.all([
    createExecutiveDashboardService(companyId),
    createPlanningTimelineService(companyId),
  ])
  return new ExecutiveNavigationService(dashboard, timeline)
}
