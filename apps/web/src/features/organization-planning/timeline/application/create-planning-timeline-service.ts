import "server-only"

import { createScenarioRepository } from "../../repositories/scenario-repository"
import { createSnapshotRepository } from "../../repositories/snapshot-repository"
import { PlanningTimelinePresenter } from "../presentation/planning-timeline-presenter"
import { PlanningTimelineService } from "./planning-timeline-service"

export async function createPlanningTimelineService(
  companyId: string
): Promise<PlanningTimelineService> {
  const [scenarios, snapshots] = await Promise.all([
    createScenarioRepository(),
    createSnapshotRepository(),
  ])

  return new PlanningTimelineService({
    companyId,
    scenarios,
    snapshots,
    presenter: PlanningTimelinePresenter.create(),
  })
}
