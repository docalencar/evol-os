import "server-only"

import type {
  ScenarioAnalysis,
} from "../analysis"

import {
  getPlanningChangeSets,
} from "../change-sets/queries"

import {
  getScenarioComparison,
} from "../comparison"

import {
  createServerGenerateScenarioAnalysisService,
  createServerGenerateScenarioProjectionService,
} from "../factories"

import type {
  ProjectionContract,
} from "../projection"

import type {
  PlanningScenarioStatus,
} from "../types/planning-contracts"

import {
  getScenario,
} from "./get-scenario"

import {
  getSnapshot,
} from "./get-snapshot"

export type PlanningScenarioPageScenario =
  Readonly<{
    id: string
    companyId: string
    workspaceId: string
    baseSnapshotId: string
    name: string
    description: string | null
    status: PlanningScenarioStatus
    version: number
    createdAt: string
    updatedAt: string
  }>

export type PlanningScenarioPageSnapshot =
  Readonly<{
    id: string
    companyId: string
    workspaceId: string
    sourceScenarioId: string | null
    version: number
    publishedAt: string
  }>

export type PlanningScenarioPageMetrics =
  Readonly<{
    totalChanges: number
    pendingChanges: number
    warnings: number
    projectedVersion: number
  }>

export type PlanningScenarioPageProjection =
  Readonly<{
    organization:
      ProjectionContract["organization"]

    metrics:
      ProjectionContract["metrics"]

    warnings:
      ProjectionContract["warnings"]

    errors:
      ProjectionContract["errors"]

    isValid: boolean
  }>

export type PlanningScenarioPageComparison =
  Awaited<
    ReturnType<
      typeof getScenarioComparison
    >
  >

export type PlanningScenarioPageStructuralImpact =
  ScenarioAnalysis["structuralImpact"]

export type PlanningScenarioPageSpanOfControl =
  ScenarioAnalysis["spanOfControl"]

export type PlanningScenarioPagePositionCapacity =
  ScenarioAnalysis["positionCapacity"]

export type PlanningScenarioPageExecutiveSummary =
  ScenarioAnalysis["executiveSummary"]

export type PlanningScenarioPageInsights =
  ScenarioAnalysis["insights"]

export type PlanningScenarioPageChangeSet =
  Awaited<
    ReturnType<
      typeof getPlanningChangeSets
    >
  >[number]

export type PlanningScenarioPage =
  Readonly<{
    scenario:
      PlanningScenarioPageScenario

    baseSnapshot:
      PlanningScenarioPageSnapshot

    metrics:
      PlanningScenarioPageMetrics

    changeSets:
      readonly PlanningScenarioPageChangeSet[]

    projection:
      PlanningScenarioPageProjection

    comparison:
      PlanningScenarioPageComparison

    structuralImpact:
      PlanningScenarioPageStructuralImpact

    spanOfControl:
      PlanningScenarioPageSpanOfControl

    positionCapacity:
      PlanningScenarioPagePositionCapacity

    executiveSummary:
      PlanningScenarioPageExecutiveSummary

    insights:
      PlanningScenarioPageInsights
  }>

function toScenarioView(
  scenario:
    NonNullable<
      Awaited<
        ReturnType<
          typeof getScenario
        >
      >
    >
): PlanningScenarioPageScenario {
  return Object.freeze({
    id:
      scenario.id,

    companyId:
      scenario.companyId,

    workspaceId:
      scenario.workspaceId,

    baseSnapshotId:
      scenario.baseSnapshotId,

    name:
      scenario.name,

    description:
      scenario.description,

    status:
      scenario.status,

    version:
      scenario.version,

    createdAt:
      scenario.createdAt.toISOString(),

    updatedAt:
      scenario.updatedAt.toISOString(),
  })
}

function toSnapshotView(
  snapshot:
    NonNullable<
      Awaited<
        ReturnType<
          typeof getSnapshot
        >
      >
    >
): PlanningScenarioPageSnapshot {
  return Object.freeze({
    id:
      snapshot.id,

    companyId:
      snapshot.companyId,

    workspaceId:
      snapshot.workspaceId,

    sourceScenarioId:
      snapshot.sourceScenarioId,

    version:
      snapshot.version,

    publishedAt:
      snapshot.publishedAt.toISOString(),
  })
}

function toProjectionView(
  projection:
    ProjectionContract
): PlanningScenarioPageProjection {
  return Object.freeze({
    organization:
      projection.organization,

    metrics:
      projection.metrics,

    warnings:
      projection.warnings,

    errors:
      projection.errors,

    isValid:
      projection.errors.length === 0,
  })
}

/**
 * Monta o ViewModel público da página de cenário.
 *
 * Responsabilidades desta query:
 *
 * - carregar os dados necessários para a página;
 * - coordenar os serviços de aplicação;
 * - adaptar contratos canônicos para o ViewModel;
 * - preservar o contrato público PlanningScenarioPage.
 *
 * Nenhuma métrica organizacional é calculada nesta camada.
 * Toda análise é produzida exclusivamente por
 * GenerateScenarioAnalysisService.
 */
export async function getPlanningScenario(
  companyId: string,
  scenarioId: string
): Promise<PlanningScenarioPage | null> {
  const scenario =
    await getScenario(
      companyId,
      scenarioId
    )

  if (!scenario) {
    return null
  }

  const [
    generateProjectionService,
    analysisService,
  ] = await Promise.all([
    createServerGenerateScenarioProjectionService(),
    createServerGenerateScenarioAnalysisService(),
  ])

  /*
   * A análise canônica é vinculada a uma projeção persistida.
   * Por isso, a projeção precisa ser gerada antes da execução
   * do GenerateScenarioAnalysisService.
   */
  const projection =
    await generateProjectionService.execute({
      companyId,
      scenarioId,
    })

  const [
    baseSnapshot,
    changeSets,
    comparison,
    analysis,
  ] = await Promise.all([
    getSnapshot(
      companyId,
      scenario.baseSnapshotId
    ),

    getPlanningChangeSets({
      companyId,
      scenarioId,
    }),

    getScenarioComparison({
      companyId,
      scenarioId,
    }),

    analysisService.execute({
      companyId,
      projectionId:
        projection.id,
    }),
  ])

  if (!baseSnapshot) {
    throw new Error(
      "O snapshot-base deste cenário não foi encontrado."
    )
  }

  if (
    baseSnapshot.workspaceId !==
    scenario.workspaceId
  ) {
    throw new Error(
      "O snapshot-base não pertence ao workspace do cenário."
    )
  }

  if (
    projection.scenarioId !==
    scenario.id
  ) {
    throw new Error(
      "A projeção gerada não pertence ao cenário informado."
    )
  }

  if (
    analysis.scenarioId !==
    scenario.id
  ) {
    throw new Error(
      "A análise gerada não pertence ao cenário informado."
    )
  }

  if (
    analysis.projectionId !==
    projection.id
  ) {
    throw new Error(
      "A análise gerada não pertence à projeção informada."
    )
  }

  const frozenChangeSets =
    Object.freeze([
      ...changeSets,
    ])

  return Object.freeze({
    scenario:
      toScenarioView(
        scenario
      ),

    baseSnapshot:
      toSnapshotView(
        baseSnapshot
      ),

    metrics:
      Object.freeze({
        totalChanges:
          frozenChangeSets.length,

        pendingChanges:
          frozenChangeSets.length,

        warnings:
          projection.warnings.length,

        projectedVersion:
          projection.version,
      }),

    changeSets:
      frozenChangeSets,

    projection:
      toProjectionView(
        projection
      ),

    comparison,

    structuralImpact:
      analysis.structuralImpact,

    spanOfControl:
      analysis.spanOfControl,

    positionCapacity:
      analysis.positionCapacity,

    executiveSummary:
      analysis.executiveSummary,

    insights:
      analysis.insights,
  })
}
