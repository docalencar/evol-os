import "server-only"

import {
  GenerateScenarioAnalysisService,
} from "../application/services"

import type {
  GenerateScenarioAnalysisService as GenerateScenarioAnalysisServiceContract,
} from "../application/services"

import {
  getScenarioComparison,
} from "../comparison"

import {
  createProjectionRepository,
} from "../repositories/projection-repository"

import {
  createSnapshotRepository,
} from "../repositories/snapshot-repository"

/**
 * Compõe o serviço canônico de análise de cenários
 * com as implementações de infraestrutura do servidor.
 *
 * A factory não executa cálculos de negócio.
 * Ela apenas conecta:
 *
 * - ProjectionRepository
 * - SnapshotRepository
 * - ScenarioComparison
 * - GenerateScenarioAnalysisService
 */
export async function createServerGenerateScenarioAnalysisService():
Promise<GenerateScenarioAnalysisServiceContract> {
  const [
    projections,
    snapshots,
  ] = await Promise.all([
    createProjectionRepository(),
    createSnapshotRepository(),
  ])

  return new GenerateScenarioAnalysisService(
    projections,
    snapshots,
    async (
      companyId,
      scenarioId
    ) => {
      const comparison =
        await getScenarioComparison({
          companyId,
          scenarioId,
        })

      return comparison.summary
    }
  )
}
