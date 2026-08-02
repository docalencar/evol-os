import "server-only"

import { PlanningInsightsEngine } from "../../planning-insights"
import {
  PlanningComparisonPresenter,
  PlanningInsightsPresenter,
} from "../../presentation"
import { ScenarioComparisonEngine } from "../../projection/comparison"
import { ScenarioExecutor } from "../../projection/execution"
import { createPlanningChangeSetRepository } from "../../repositories/planning-change-set-repository"
import { createScenarioRepository } from "../../repositories/scenario-repository"
import { createSnapshotRepository } from "../../repositories/snapshot-repository"
import {
  PlanningProjectionReadService,
  PlanningReadApplicationService,
} from "../services"

export async function createPlanningReadService(
  companyId: string,
): Promise<PlanningReadApplicationService> {
  const [
    scenarios,
    snapshots,
    changeSets,
  ] = await Promise.all([
    createScenarioRepository(),
    createSnapshotRepository(),
    createPlanningChangeSetRepository(),
  ])

  const projection =
    new PlanningProjectionReadService({
      companyId,
      scenarios,
      snapshots,
      changeSets,
      projector: ScenarioExecutor.create(),
    })

  return new PlanningReadApplicationService({
    projection,
    comparator:
      ScenarioComparisonEngine.create(),
    insights:
      PlanningInsightsEngine.create(),
    comparisonPresenter:
      PlanningComparisonPresenter.create(),
    insightsPresenter:
      PlanningInsightsPresenter.create(),
  })
}
