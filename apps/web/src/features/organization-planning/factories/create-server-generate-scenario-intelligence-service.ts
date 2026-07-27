import "server-only"

import {
  createGenerateScenarioIntelligenceService,
  type GenerateScenarioIntelligenceService,
} from "../application/services"

import {
  createProjectionRepository,
} from "../repositories/projection-repository"

import {
  createSnapshotRepository,
} from "../repositories/snapshot-repository"


export async function createServerGenerateScenarioIntelligenceService(): Promise<GenerateScenarioIntelligenceService> {
  const [
    projections,
    snapshots,
  ] = await Promise.all([
    createProjectionRepository(),
    createSnapshotRepository(),
  ])

  return createGenerateScenarioIntelligenceService({
    projections,
    snapshots,
  })
}
