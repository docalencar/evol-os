import "server-only"

import {
  createProjectScenarioService,
  type ProjectScenarioService,
} from "../application/services"
import {
  createPlanningChangeSetRepository,
} from "../change-sets/repositories"
import {
  createScenarioRepository,
} from "../repositories/scenario-repository"
import {
  createSnapshotRepository,
} from "../repositories/snapshot-repository"

export async function createServerProjectScenarioService(): Promise<ProjectScenarioService> {
  const [
    scenarios,
    snapshots,
    changeSets,
  ] = await Promise.all([
    createScenarioRepository(),
    createSnapshotRepository(),
    createPlanningChangeSetRepository(),
  ])

  return createProjectScenarioService({
    scenarios,
    snapshots,
    changeSets,
  })
}
