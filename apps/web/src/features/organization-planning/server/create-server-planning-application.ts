import "server-only"

import {
  ArchiveScenarioHandler,
  CreateScenarioHandler,
  CreateWorkspaceHandler,
  InMemorySnapshotVersionAllocator,
  PlanningDomainEventCollector,
  PublishScenarioHandler,
  SimplePlanningUnitOfWork,
} from "../application"
import { createScenarioRepository } from "../repositories/scenario-repository"
import { createSnapshotRepository } from "../repositories/snapshot-repository"
import { createWorkspaceRepository } from "../repositories/workspace-repository"
import { createPlanningPublicationRepository } from "../repositories/planning-publication-repository"

export type ServerPlanningApplication = Readonly<{
  createWorkspace: CreateWorkspaceHandler
  createScenario: CreateScenarioHandler
  archiveScenario: ArchiveScenarioHandler
  publishScenario: PublishScenarioHandler
  eventCollector: PlanningDomainEventCollector
}>

export async function createServerPlanningApplication(): Promise<ServerPlanningApplication> {
  const [
    workspaces,
    scenarios,
    snapshots,
    publication,
  ] = await Promise.all([
    createWorkspaceRepository(),
    createScenarioRepository(),
    createSnapshotRepository(),
    createPlanningPublicationRepository(),
  ])

  const eventCollector = new PlanningDomainEventCollector()

  /*
   * Implementações temporárias da camada de aplicação.
   *
   * O UnitOfWork atual controla apenas o ciclo lógico da operação e ainda
   * não representa uma transação real no PostgreSQL.
   *
   * O allocator em memória também será substituído por uma implementação
   * persistente antes de o fluxo de publicação ser conectado à produção.
   */
  const createWorkspaceUnitOfWork = new SimplePlanningUnitOfWork()
  const createScenarioUnitOfWork = new SimplePlanningUnitOfWork()
  const archiveScenarioUnitOfWork = new SimplePlanningUnitOfWork()
  const snapshotVersionAllocator =
    new InMemorySnapshotVersionAllocator()

  return Object.freeze({
    createWorkspace: new CreateWorkspaceHandler(
      workspaces,
      snapshots,
      snapshotVersionAllocator,
      createWorkspaceUnitOfWork,
      eventCollector
    ),

    createScenario: new CreateScenarioHandler(
      workspaces,
      scenarios,
      snapshots,
      createScenarioUnitOfWork,
      eventCollector
    ),

    archiveScenario: new ArchiveScenarioHandler(
      scenarios,
      archiveScenarioUnitOfWork,
      eventCollector
    ),

    publishScenario: new PublishScenarioHandler(
      publication,
      eventCollector
    ),

    eventCollector,
  })
}
