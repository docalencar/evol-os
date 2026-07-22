import type { OrganizationPlanningWorkspace } from "../../domain/organization-planning-workspace"
import type { PlanningScenario } from "../../domain/planning-scenario"
import type { PublishedSnapshot } from "../../domain/published-snapshot"

export interface WorkspaceApplicationRepository {
  findById(
    companyId: string,
    workspaceId: string
  ): Promise<OrganizationPlanningWorkspace | null>
  create(workspace: OrganizationPlanningWorkspace): Promise<void>
}

export interface ScenarioApplicationRepository {
  findById(
    companyId: string,
    scenarioId: string
  ): Promise<PlanningScenario | null>
  create(scenario: PlanningScenario): Promise<void>
  save(
    scenario: PlanningScenario,
    expectedVersion: number
  ): Promise<void>
}

export interface SnapshotApplicationRepository {
  findById(
    companyId: string,
    snapshotId: string
  ): Promise<PublishedSnapshot | null>
  create(snapshot: PublishedSnapshot): Promise<void>
}
