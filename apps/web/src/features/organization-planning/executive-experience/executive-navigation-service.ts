import type { ExecutiveDashboardViewModel } from "../executive-dashboard"
import type { PlanningTimelineViewModel } from "../timeline"
import type { ExecutiveNavigationViewModel } from "./executive-navigation-view-model"

type DashboardSource = Readonly<{ execute(scenarioId: string): Promise<ExecutiveDashboardViewModel> }>
type TimelineSource = Readonly<{ execute(input: { workspaceId: string }): Promise<PlanningTimelineViewModel> }>

export class ExecutiveNavigationService {
  constructor(
    private readonly dashboards: DashboardSource,
    private readonly timelines: TimelineSource
  ) {}

  async execute(scenarioId: string): Promise<ExecutiveNavigationViewModel> {
    const dashboard = await this.dashboards.execute(scenarioId)
    const timeline = await this.timelines.execute({ workspaceId: dashboard.scenario.workspaceId })
    return Object.freeze({ dashboard, timeline })
  }
}
