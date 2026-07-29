import "server-only"

import {
  ArchiveScenarioHandler,
  CreateScenarioHandler,
  CreateScenarioBranchService,
  CreateWorkspaceHandler,
  PlanningDomainEventCollector,
  PublishScenarioHandler,
  SimplePlanningUnitOfWork,
} from "../application"
import { ScenarioExecutor } from "../projection"
import { createScenarioRepository } from "../repositories/scenario-repository"
import { createSnapshotRepository } from "../repositories/snapshot-repository"
import { createWorkspaceRepository } from "../repositories/workspace-repository"
import { createPlanningPublicationRepository } from "../repositories/planning-publication-repository"
import { createPlanningChangeSetRepository } from "../repositories/planning-change-set-repository"
import { createPlanningBaselineRepository } from "../repositories/planning-baseline-repository"
import { createPlanningOperationalOrganizationSource } from "../repositories/planning-operational-organization-source"

export type ServerPlanningApplication = Readonly<{
  createWorkspace: CreateWorkspaceHandler
  createScenario: CreateScenarioHandler
  createScenarioBranch: CreateScenarioBranchService
  archiveScenario: ArchiveScenarioHandler
  publishScenario: PublishScenarioHandler
  eventCollector: PlanningDomainEventCollector
}>

export async function createServerPlanningApplication(): Promise<ServerPlanningApplication> {
  const [
    workspaces,
    scenarios,
    snapshots,
    changeSets,
    publication,
    baseline,
    operationalOrganization,
  ] = await Promise.all([
    createWorkspaceRepository(),
    createScenarioRepository(),
    createSnapshotRepository(),
    createPlanningChangeSetRepository(),
    createPlanningPublicationRepository(),
    createPlanningBaselineRepository(),
    createPlanningOperationalOrganizationSource(),
  ])

  const eventCollector = new PlanningDomainEventCollector()

  /*
   * Implementações temporárias da camada de aplicação.
   *
   * O UnitOfWork atual controla apenas o ciclo lógico da operação e ainda
   * não representa uma transação real no PostgreSQL.
   *
   * O bootstrap do Workspace já usa a RPC transacional de Baseline; estes
   * UnitOfWork permanecem apenas nos handlers ainda não migrados.
   */
  const createScenarioUnitOfWork = new SimplePlanningUnitOfWork()
  const archiveScenarioUnitOfWork = new SimplePlanningUnitOfWork()
  return Object.freeze({
    createWorkspace: new CreateWorkspaceHandler(
      baseline,
      operationalOrganization,
      eventCollector
    ),

    createScenario: new CreateScenarioHandler(
      workspaces,
      scenarios,
      snapshots,
      createScenarioUnitOfWork,
      eventCollector
    ),

    createScenarioBranch: new CreateScenarioBranchService(
      scenarios,
      eventCollector
    ),

    archiveScenario: new ArchiveScenarioHandler(
      scenarios,
      archiveScenarioUnitOfWork,
      eventCollector
    ),

    publishScenario: new PublishScenarioHandler(
      scenarios,
      snapshots,
      changeSets,
      ScenarioExecutor.create(),
      publication,
      eventCollector
    ),

    eventCollector,
  })
}
