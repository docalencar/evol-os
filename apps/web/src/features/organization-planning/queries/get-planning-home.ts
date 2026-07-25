import "server-only"

import type {
  PlanningScenarioStatus,
} from "../types/planning-contracts"
import { listScenarios } from "./list-scenarios"
import { listSnapshots } from "./list-snapshots"
import { listWorkspaces } from "./list-workspaces"

export type PlanningHomeWorkspace = Readonly<{
  id: string
  companyId: string
  version: number
  createdAt: string
  updatedAt: string
}>

export type PlanningHomeSnapshot = Readonly<{
  id: string
  companyId: string
  workspaceId: string
  sourceScenarioId: string | null
  version: number
  publishedAt: string
}>

export type PlanningHomeScenario = Readonly<{
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

export type PlanningHomeMetrics = Readonly<{
  totalScenarios: number
  activeScenarios: number
  pendingApprovalScenarios: number
  publishedScenarios: number
}>

export type PlanningHome = Readonly<{
  workspace: PlanningHomeWorkspace | null
  currentSnapshot: PlanningHomeSnapshot | null
  scenarios: readonly PlanningHomeScenario[]
  metrics: PlanningHomeMetrics
}>

const ACTIVE_SCENARIO_STATUSES: readonly PlanningScenarioStatus[] = [
  "draft",
  "submitted",
  "approved",
  "rejected",
]

function toWorkspaceView(
  workspace: Awaited<ReturnType<typeof listWorkspaces>>[number]
): PlanningHomeWorkspace {
  return Object.freeze({
    id: workspace.id,
    companyId: workspace.companyId,
    version: workspace.version,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  })
}

function toSnapshotView(
  snapshot: Awaited<ReturnType<typeof listSnapshots>>[number]
): PlanningHomeSnapshot {
  return Object.freeze({
    id: snapshot.id,
    companyId: snapshot.companyId,
    workspaceId: snapshot.workspaceId,
    sourceScenarioId: snapshot.sourceScenarioId,
    version: snapshot.version,
    publishedAt: snapshot.publishedAt.toISOString(),
  })
}

function toScenarioView(
  scenario: Awaited<ReturnType<typeof listScenarios>>[number]
): PlanningHomeScenario {
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

export async function getPlanningHome(
  companyId: string
): Promise<PlanningHome> {
  const [workspaces, snapshots, scenarios] = await Promise.all([
    listWorkspaces(companyId),
    listSnapshots(companyId),
    listScenarios(companyId),
  ])

  const workspace = workspaces[0] ?? null

  if (!workspace) {
    return Object.freeze({
      workspace: null,
      currentSnapshot: null,
      scenarios: Object.freeze([]),
      metrics: Object.freeze({
        totalScenarios: 0,
        activeScenarios: 0,
        pendingApprovalScenarios: 0,
        publishedScenarios: 0,
      }),
    })
  }

  const workspaceSnapshots = snapshots.filter(
    (snapshot) => snapshot.workspaceId === workspace.id
  )

  const workspaceScenarios = scenarios.filter(
    (scenario) => scenario.workspaceId === workspace.id
  )

  const currentSnapshot =
    workspaceSnapshots[0] ?? null

  const scenarioViews = Object.freeze(
    workspaceScenarios.map(toScenarioView)
  )

  return Object.freeze({
    workspace: toWorkspaceView(workspace),
    currentSnapshot: currentSnapshot
      ? toSnapshotView(currentSnapshot)
      : null,
    scenarios: scenarioViews,
    metrics: Object.freeze({
      totalScenarios: workspaceScenarios.length,
      activeScenarios: workspaceScenarios.filter((scenario) =>
        ACTIVE_SCENARIO_STATUSES.includes(scenario.status)
      ).length,
      pendingApprovalScenarios: workspaceScenarios.filter(
        (scenario) => scenario.status === "submitted"
      ).length,
      publishedScenarios: workspaceScenarios.filter(
        (scenario) => scenario.status === "published"
      ).length,
    }),
  })
}
