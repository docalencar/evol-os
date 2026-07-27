import "server-only"

import {
  RepositoryProjectionVersionAllocator,
} from "../application/ports"
import {
  createGenerateScenarioProjectionService,
  type GenerateScenarioProjectionService,
} from "../application/services"
import {
  createProjectionRepository,
} from "../repositories/projection-repository"
import {
  createServerProjectScenarioService,
} from "./create-server-project-scenario-service"

export async function createServerGenerateScenarioProjectionService(): Promise<GenerateScenarioProjectionService> {
  const [
    projectScenarioService,
    projections,
  ] = await Promise.all([
    createServerProjectScenarioService(),
    createProjectionRepository(),
  ])

  const versionAllocator =
    new RepositoryProjectionVersionAllocator(
      projections
    )

  return createGenerateScenarioProjectionService({
    projectScenarioService,
    projections,
    versionAllocator,
  })
}
