import type {
  CreateBasePlanningChangeSetInput,
  PlanningChangeSet,
  PlanningChangeSetPayload,
  PlanningChangeType,
  UpdateBasePlanningChangeSetInput,
} from "../../change-sets"
import type {
  OrganizationPlanningWorkspace,
} from "../../domain/organization-planning-workspace"
import type {
  PlanningScenario,
} from "../../domain/planning-scenario"
import type {
  PublishedSnapshot,
} from "../../domain/published-snapshot"
import type {
  OrganizationSnapshot,
} from "../../snapshot"

type CreatePlanningChangeSetInput<
  TChangeType extends PlanningChangeType = PlanningChangeType,
> = CreateBasePlanningChangeSetInput<
  TChangeType,
  PlanningChangeSetPayload<TChangeType>
>

type UpdatePlanningChangeSetInput<
  TChangeType extends PlanningChangeType = PlanningChangeType,
> = UpdateBasePlanningChangeSetInput<
  PlanningChangeSetPayload<TChangeType>
>

export interface WorkspaceApplicationRepository {
  findById(
    companyId: string,
    workspaceId: string
  ): Promise<OrganizationPlanningWorkspace | null>

  create(
    workspace: OrganizationPlanningWorkspace
  ): Promise<void>
}

export interface ScenarioApplicationRepository {
  findById(
    companyId: string,
    scenarioId: string
  ): Promise<PlanningScenario | null>

  create(
    scenario: PlanningScenario
  ): Promise<void>

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

  findOrganizationById(
    companyId: string,
    snapshotId: string
  ): Promise<OrganizationSnapshot | null>

  create(
    snapshot: PublishedSnapshot
  ): Promise<void>
}

export interface PlanningChangeSetApplicationRepository {
  findById(
    companyId: string,
    changeSetId: string
  ): Promise<PlanningChangeSet | null>

  findByScenario(
    companyId: string,
    scenarioId: string
  ): Promise<readonly PlanningChangeSet[]>

  create<TChangeType extends PlanningChangeType>(
    input: CreatePlanningChangeSetInput<TChangeType>
  ): Promise<PlanningChangeSet>

  createMany(
    inputs: readonly CreatePlanningChangeSetInput[]
  ): Promise<readonly PlanningChangeSet[]>

  update<TChangeType extends PlanningChangeType>(
    companyId: string,
    changeSetId: string,
    input: UpdatePlanningChangeSetInput<TChangeType>
  ): Promise<PlanningChangeSet>

  delete(
    companyId: string,
    changeSetId: string
  ): Promise<void>
}
