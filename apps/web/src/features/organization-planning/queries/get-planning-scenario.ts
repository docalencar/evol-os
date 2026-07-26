import "server-only"

import {
  getPlanningChangeSets,
} from "../change-sets/queries"

import {
  getScenarioComparison,
} from "../comparison"

import {
  calculateStructuralImpact,
  generateScenarioInsights,
} from "../intelligence"

import type {
  ScenarioStructuralImpact,
  ScenarioInsight,
} from "../intelligence"
import {
  createServerProjectScenarioService,
} from "../factories"

import {
  createOrganizationSnapshotBuilder,
} from "../snapshot"
import type {
  ProjectionResult,
} from "../projection"
import type {
  PlanningScenarioStatus,
} from "../types/planning-contracts"
import { getScenario } from "./get-scenario"
import { getSnapshot } from "./get-snapshot"
import {
  calculateSpanOfControl,
  calculatePositionCapacity,
} from "../intelligence"

export type PlanningScenarioPageScenario = Readonly<{
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

export type PlanningScenarioPageSnapshot = Readonly<{
  id: string
  companyId: string
  workspaceId: string
  sourceScenarioId: string | null
  version: number
  publishedAt: string
}>

export type PlanningScenarioPageMetrics = Readonly<{
  totalChanges: number
  pendingChanges: number
  warnings: number
  projectedVersion: number
}>

export type PlanningScenarioPageProjection =
  Readonly<{
    organization:
      ProjectionResult["organization"]
    metrics:
      ProjectionResult["metrics"]
    warnings:
      ProjectionResult["warnings"]
    errors:
      ProjectionResult["errors"]
    isValid: boolean
  }>

export type PlanningScenarioPageComparison =
  Awaited<
    ReturnType<typeof getScenarioComparison>
  >

export type PlanningScenarioPageStructuralImpact =
  ScenarioStructuralImpact

export type PlanningScenarioPageSpanOfControl =
  ReturnType<typeof calculateSpanOfControl>

export type PlanningScenarioPagePositionCapacity =
  ReturnType<typeof calculatePositionCapacity>

export type PlanningScenarioPageInsights =
  readonly ScenarioInsight[]

export type PlanningScenarioPageChangeSet =
  Awaited<
    ReturnType<typeof getPlanningChangeSets>
  >[number]

export type PlanningScenarioPage = Readonly<{
  scenario: PlanningScenarioPageScenario
  baseSnapshot: PlanningScenarioPageSnapshot
  metrics: PlanningScenarioPageMetrics
  changeSets: readonly PlanningScenarioPageChangeSet[]
  projection: PlanningScenarioPageProjection
  comparison: PlanningScenarioPageComparison
  structuralImpact: PlanningScenarioPageStructuralImpact
  spanOfControl: PlanningScenarioPageSpanOfControl
  positionCapacity: PlanningScenarioPagePositionCapacity
  insights: PlanningScenarioPageInsights
}>

function toScenarioView(
  scenario: NonNullable<
    Awaited<ReturnType<typeof getScenario>>
  >
): PlanningScenarioPageScenario {
  return Object.freeze({
    id: scenario.id,
    companyId: scenario.companyId,
    workspaceId: scenario.workspaceId,
    baseSnapshotId: scenario.baseSnapshotId,
    name: scenario.name,
    description: scenario.description,
    status: scenario.status,
    version: scenario.version,
    createdAt: scenario.createdAt.toISOString(),
    updatedAt: scenario.updatedAt.toISOString(),
  })
}

function toSnapshotView(
  snapshot: NonNullable<
    Awaited<ReturnType<typeof getSnapshot>>
  >
): PlanningScenarioPageSnapshot {
  return Object.freeze({
    id: snapshot.id,
    companyId: snapshot.companyId,
    workspaceId: snapshot.workspaceId,
    sourceScenarioId: snapshot.sourceScenarioId,
    version: snapshot.version,
    publishedAt: snapshot.publishedAt.toISOString(),
  })
}

function toProjectionView(
  projection: ProjectionResult
): PlanningScenarioPageProjection {
  return Object.freeze({
    organization: projection.organization,
    metrics: projection.metrics,
    warnings: projection.warnings,
    errors: projection.errors,
    isValid: projection.isValid,
  })
}

export async function getPlanningScenario(
  companyId: string,
  scenarioId: string
): Promise<PlanningScenarioPage | null> {
  const scenario =
    await getScenario(companyId, scenarioId)

  if (!scenario) {
    return null
  }

  const projectScenarioService =
    await createServerProjectScenarioService()

  const organizationSnapshotBuilder =
    await createOrganizationSnapshotBuilder()

  const [
    baseSnapshot,
    changeSets,
    projection,
    comparison,
    organizationSnapshot,
  ] = await Promise.all([
    getSnapshot(
      companyId,
      scenario.baseSnapshotId
    ),
    getPlanningChangeSets({
      companyId,
      scenarioId,
    }),
    projectScenarioService.execute({
      companyId,
      scenarioId,
    }),
    getScenarioComparison({
      companyId,
      scenarioId,
    }),
    organizationSnapshotBuilder.build(
      companyId
    ),
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

  const frozenChangeSets =
    Object.freeze([...changeSets])

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

  return Object.freeze({
  scenario: toScenarioView(scenario),
  baseSnapshot: toSnapshotView(baseSnapshot),
  metrics: Object.freeze({
    totalChanges: frozenChangeSets.length,
    pendingChanges: frozenChangeSets.length,
    warnings: projection.warnings.length,
    projectedVersion: scenario.version,
  }),
  changeSets: frozenChangeSets,
  projection: toProjectionView(projection),
  comparison,
  structuralImpact,
  spanOfControl,
  positionCapacity,
  insights,
})
}
