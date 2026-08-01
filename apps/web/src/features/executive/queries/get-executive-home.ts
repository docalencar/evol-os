import "server-only"

import { getExecutiveKPIDashboard } from "@/features/kpi-dashboard"

import { ExecutiveApplicationService } from "../application"
import { ExecutivePresenter } from "../presenters"
import type { ExecutiveHomeDTO } from "../types"
import {
  ExecutiveQueryService,
  type ExecutiveHomeSource,
} from "./executive-query-service"
import { getExecutiveOverview } from "./get-executive-overview"

class CurrentExecutiveHomeSource implements ExecutiveHomeSource {
  async load(): Promise<ExecutiveHomeDTO> {
    const [overview, dashboard] = await Promise.all([
      getExecutiveOverview(),
      getExecutiveKPIDashboard(),
    ])

    return Object.freeze({
      generatedAt: new Date().toISOString(),
      overview,
      dashboard,
    })
  }
}

export async function getExecutiveHome() {
  const query = new ExecutiveQueryService(
    new CurrentExecutiveHomeSource()
  )

  const presenter = new ExecutivePresenter()

  const application = new ExecutiveApplicationService(
    query,
    presenter
  )

  return application.execute()
}
