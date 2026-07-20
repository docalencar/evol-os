import type { ExecutiveDashboardSummary } from "../types/executive-dashboard-summary"

import { presentExecutiveDashboardSummary } from "../presenters/present-executive-dashboard-summary"
import { createExecutiveDashboardSummary } from "../services/create-executive-dashboard-summary"

type Input = {
  companyId: string
}

export async function getExecutiveDashboardSummary(
  input: Input,
): Promise<ExecutiveDashboardSummary> {
  void input

  return presentExecutiveDashboardSummary(
    createExecutiveDashboardSummary(),
  )
}
