import type { OrganizationPlanningWorkspace } from "../../domain/organization-planning-workspace"
import type { PlanningScenario } from "../../domain/planning-scenario"
import type { PublishedSnapshot } from "../../domain/published-snapshot"
import type {
  ScenarioDTO,
  SnapshotDTO,
  WorkspaceDTO,
} from "./planning-dto"

export function toSnapshotDTO(
  snapshot: PublishedSnapshot
): SnapshotDTO {
  return Object.freeze({
    id: snapshot.id,
    companyId: snapshot.companyId,
    workspaceId: snapshot.workspaceId,
    sourceScenarioId: snapshot.sourceScenarioId,
    version: snapshot.version,
    publishedAt: snapshot.publishedAt.toISOString(),
  })
}

export function toWorkspaceDTO(
  workspace: OrganizationPlanningWorkspace,
  initialSnapshot: PublishedSnapshot
): WorkspaceDTO {
  return Object.freeze({
    id: workspace.id,
    companyId: workspace.companyId,
    version: workspace.version,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
    initialSnapshot: toSnapshotDTO(initialSnapshot),
  })
}

export function toScenarioDTO(
  scenario: PlanningScenario
): ScenarioDTO {
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
