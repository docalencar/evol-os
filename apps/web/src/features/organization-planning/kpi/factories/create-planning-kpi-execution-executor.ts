import { SingleExecutionExecutor, type KPIEvaluationApplicationService, type KPIExecutionExecutor } from "../../../kpi-engine"
import type { PlanningKPIService } from "../services"

export function createPlanningKPIExecutionExecutor(
  planning: PlanningKPIService,
  evaluations: KPIEvaluationApplicationService
): KPIExecutionExecutor {
  planning.register()
  return new SingleExecutionExecutor("organization-planning", evaluations)
}
