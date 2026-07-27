import type {
  ProjectionContract,
} from "../../projection"

import {
  createScenarioIntelligence,
} from "../../intelligence"

import {
  bootstrapProjectedOrganization,
} from "../../projection/bootstrap"

import type {
  ProjectionApplicationRepository,
  SnapshotApplicationRepository,
} from "../ports"


export type GenerateScenarioIntelligenceInput =
  Readonly<{
    companyId: string
    projectionId: string
  }>


export type GenerateScenarioIntelligenceServiceDependencies =
  Readonly<{
    projections:
      ProjectionApplicationRepository

    snapshots:
      SnapshotApplicationRepository
  }>


export class GenerateScenarioIntelligenceService {
  constructor(
    private readonly projections:
      ProjectionApplicationRepository,

    private readonly snapshots:
      SnapshotApplicationRepository
  ) {}

  async execute(
    input:
      GenerateScenarioIntelligenceInput
  ) {
    const projection =
      await this.projections.findById(
        input.companyId,
        input.projectionId
      )

    if (!projection) {
      throw new Error(
        "Projeção não encontrada."
      )
    }


    const organizationSnapshot =
      await this.snapshots.findOrganizationById(
        input.companyId,
        projection.sourceSnapshotId
      )


    if (!organizationSnapshot) {
      throw new Error(
        "Snapshot organizacional da projeção não encontrado."
      )
    }


    const baselineOrganization =
      bootstrapProjectedOrganization(
        organizationSnapshot
      )


    return createScenarioIntelligence({
      currentMetrics:
        baselineOrganization.metrics,

      projection,
    })
  }
}


export function createGenerateScenarioIntelligenceService(
  dependencies:
    GenerateScenarioIntelligenceServiceDependencies
) {
  return new GenerateScenarioIntelligenceService(
    dependencies.projections,
    dependencies.snapshots
  )
}
