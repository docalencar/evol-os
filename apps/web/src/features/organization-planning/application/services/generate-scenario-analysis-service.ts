import {
  createScenarioAnalysis,
  type ScenarioAnalysis,
} from "../../analysis"

import type {
  ScenarioComparisonSummary,
} from "../../comparison"

import {
  calculateExecutiveScenarioSummary,
  calculatePositionCapacity,
  calculateSpanOfControl,
  calculateStructuralImpact,
  createScenarioIntelligence,
  generateScenarioInsights,
} from "../../intelligence"

import {
  bootstrapProjectedOrganization,
} from "../../projection/bootstrap"

import type {
  ProjectionApplicationRepository,
  SnapshotApplicationRepository,
} from "../ports"

export type GenerateScenarioAnalysisInput =
  Readonly<{
    companyId: string
    projectionId: string
  }>

export type GetScenarioComparisonSummary =
  (
    companyId: string,
    scenarioId: string
  ) =>
    Promise<ScenarioComparisonSummary>

export type GenerateScenarioAnalysisServiceDependencies =
  Readonly<{
    projections:
      ProjectionApplicationRepository

    snapshots:
      SnapshotApplicationRepository

    getComparisonSummary:
      GetScenarioComparisonSummary

    now?: () => Date
  }>

export class GenerateScenarioAnalysisService {
  private readonly now:
    () => Date

  constructor(
    private readonly projections:
      ProjectionApplicationRepository,

    private readonly snapshots:
      SnapshotApplicationRepository,

    private readonly getComparisonSummary:
      GetScenarioComparisonSummary,

    now:
      () => Date =
      () => new Date()
  ) {
    this.now =
      now
  }

  async execute(
    input:
      GenerateScenarioAnalysisInput
  ): Promise<ScenarioAnalysis> {
    const companyId =
      input.companyId.trim()

    const projectionId =
      input.projectionId.trim()

    if (!companyId) {
      throw new Error(
        "companyId é obrigatório."
      )
    }

    if (!projectionId) {
      throw new Error(
        "projectionId é obrigatório."
      )
    }

    const projection =
      await this.projections.findById(
        companyId,
        projectionId
      )

    if (!projection) {
      throw new Error(
        "Projeção não encontrada."
      )
    }

    if (
      projection.companyId !==
      companyId
    ) {
      throw new Error(
        "A projeção não pertence à empresa informada."
      )
    }

    const organizationSnapshot =
      await this.snapshots
        .findOrganizationById(
          companyId,
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

    const intelligence =
      createScenarioIntelligence({
        currentMetrics:
          baselineOrganization.metrics,

        projection,
      })

    const structuralImpact =
      calculateStructuralImpact(
        organizationSnapshot,
        projection.organization
      )

    const spanOfControl =
      calculateSpanOfControl(
        projection.organization
      )

    const positionCapacity =
      calculatePositionCapacity({
        positions:
          projection.organization.positions,

        employees:
          projection.organization.employees,
      })

    const insights =
      generateScenarioInsights(
        organizationSnapshot,
        projection.organization
      )

    const comparisonSummary =
      await this.getComparisonSummary(
        companyId,
        projection.scenarioId
      )

    const executiveSummary =
      calculateExecutiveScenarioSummary({
        comparison:
          comparisonSummary,

        structuralImpact,

        insights,

        spanOfControl,

        positionCapacity,
      })

    return createScenarioAnalysis({
      intelligence,

      structuralImpact,

      spanOfControl,

      positionCapacity,

      insights,

      executiveSummary,

      generatedAt:
        this.now(),
    })
  }
}

export function createGenerateScenarioAnalysisService(
  dependencies:
    GenerateScenarioAnalysisServiceDependencies
) {
  return new GenerateScenarioAnalysisService(
    dependencies.projections,
    dependencies.snapshots,
    dependencies.getComparisonSummary,
    dependencies.now
  )
}
