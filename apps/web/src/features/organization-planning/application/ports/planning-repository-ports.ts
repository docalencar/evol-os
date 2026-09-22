import type { OrganizationPlanningWorkspace } from "../../domain/organization-planning-workspace"
import type { PlanningScenario } from "../../domain/planning-scenario"
import type { PublishedSnapshot } from "../../domain/published-snapshot"

export interface WorkspaceApplicationRepository {
  findById(
    companyId: string,
    workspaceId: string
  ): Promise<OrganizationPlanningWorkspace | null>
  /** Compatibility-only port. Active product creation uses bootstrap_planning_workspace_v1. */
  create(workspace: OrganizationPlanningWorkspace): Promise<void>
}

export interface ScenarioApplicationRepository {
  findById(
    companyId: string,
    scenarioId: string
  ): Promise<PlanningScenario | null>
  create(scenario: PlanningScenario): Promise<PlanningScenario>
  save(scenario: PlanningScenario, expectedVersion: number): Promise<void>
}

export interface ScenarioBranchApplicationRepository {
  findById(
    companyId: string,
    scenarioId: string
  ): Promise<PlanningScenario | null>
  createBranch(scenario: PlanningScenario, sourceVersion: number): Promise<PlanningScenario>
}

export interface ScenarioOperationsApplicationRepository
  extends ScenarioApplicationRepository {
  rename(scenarioId: string, expectedVersion: number, name: string): Promise<PlanningScenario>
  deleteDraft(companyId: string, scenarioId: string, expectedVersion: number): Promise<void>
}

export interface SnapshotApplicationRepository {
  findById(
    companyId: string,
    snapshotId: string
  ): Promise<PublishedSnapshot | null>
  create(snapshot: PublishedSnapshot): Promise<void>
}
