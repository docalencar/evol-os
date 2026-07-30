import "server-only"

import { createPlanningReadService } from "../application"
import { ExecutiveDashboardPresenter } from "./executive-dashboard-presenter"
import { ExecutiveDashboardService } from "./executive-dashboard-service"

export async function createExecutiveDashboardService(companyId: string): Promise<ExecutiveDashboardService> {
  return new ExecutiveDashboardService(
    await createPlanningReadService(companyId),
    ExecutiveDashboardPresenter.create()
  )
}
