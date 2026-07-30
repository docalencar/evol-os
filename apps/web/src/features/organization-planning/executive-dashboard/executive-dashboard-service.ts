import type { PlanningDashboardViewModel } from "../application"
import type { ExecutiveDashboardViewModel } from "./executive-dashboard-view-model"

type PlanningDashboardSource = Readonly<{
  execute(scenarioId: string): Promise<PlanningDashboardViewModel>
}>

type ExecutiveDashboardPresenterPort = Readonly<{
  present(source: PlanningDashboardViewModel): ExecutiveDashboardViewModel
}>

export class ExecutiveDashboardService {
  constructor(
    private readonly planning: PlanningDashboardSource,
    private readonly presenter: ExecutiveDashboardPresenterPort
  ) {}

  async execute(scenarioId: string): Promise<ExecutiveDashboardViewModel> {
    return this.presenter.present(await this.planning.execute(scenarioId))
  }
}
