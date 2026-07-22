import assert from "node:assert/strict"
import test from "node:test"

import { PlanningScenario } from "../../domain/planning-scenario"
import { PublishedSnapshot } from "../../domain/published-snapshot"
import { createScenario } from "../../services/create-scenario"
import { createWorkspace } from "../../services/create-workspace"
import { ArchiveScenarioHandler } from "../handlers/archive-scenario-handler"
import { CreateScenarioHandler } from "../handlers/create-scenario-handler"
import { CreateWorkspaceHandler } from "../handlers/create-workspace-handler"
import { PublishScenarioHandler } from "../handlers/publish-scenario-handler"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import type {
  ScenarioApplicationRepository,
  SnapshotApplicationRepository,
  WorkspaceApplicationRepository,
} from "../ports/planning-repository-ports"
import { InMemorySnapshotVersionAllocator } from "../ports/snapshot-version-allocator"
import {
  SimplePlanningUnitOfWork,
  type PlanningUnitOfWork,
} from "../transactions/planning-unit-of-work"
import type { OrganizationPlanningWorkspace } from "../../domain/organization-planning-workspace"
import type { PlanningDomainEvent } from "../../events/planning-domain-event"

const companyId = "00000000-0000-4000-8000-000000000001"
const workspaceId = "00000000-0000-4000-8000-000000000002"
const baseSnapshotId = "00000000-0000-4000-8000-000000000003"
const scenarioId = "00000000-0000-4000-8000-000000000004"
const snapshotId = "00000000-0000-4000-8000-000000000005"
const occurredAt = new Date("2026-07-10T12:00:00.000Z")

class MemoryWorkspaceRepository
  implements WorkspaceApplicationRepository
{
  readonly items = new Map<string, OrganizationPlanningWorkspace>()
  shouldFailCreate = false

  async findById(company: string, id: string) {
    const workspace = this.items.get(id) ?? null
    return workspace?.companyId === company ? workspace : null
  }

  async create(workspace: OrganizationPlanningWorkspace) {
    if (this.shouldFailCreate) throw new Error("workspace failure")
    this.items.set(workspace.id, workspace)
  }
}

class MemoryScenarioRepository
  implements ScenarioApplicationRepository
{
  readonly items = new Map<string, PlanningScenario>()
  saveExpectedVersions: number[] = []
  shouldFailCreate = false

  async findById(company: string, id: string) {
    const scenario = this.items.get(id) ?? null
    return scenario?.companyId === company ? scenario : null
  }

  async create(scenario: PlanningScenario) {
    if (this.shouldFailCreate) throw new Error("scenario failure")
    this.items.set(scenario.id, scenario)
  }

  async save(scenario: PlanningScenario, expectedVersion: number) {
    this.saveExpectedVersions.push(expectedVersion)
    this.items.set(scenario.id, scenario)
  }
}

class MemorySnapshotRepository
  implements SnapshotApplicationRepository
{
  readonly items = new Map<string, PublishedSnapshot>()
  shouldFailCreate = false

  async findById(company: string, id: string) {
    const snapshot = this.items.get(id) ?? null
    return snapshot?.companyId === company ? snapshot : null
  }

  async create(snapshot: PublishedSnapshot) {
    if (this.shouldFailCreate) throw new Error("snapshot failure")
    this.items.set(snapshot.id, snapshot)
  }
}

class RecordingUnitOfWork implements PlanningUnitOfWork {
  begins = 0
  commits = 0
  rollbacks = 0

  async begin() { this.begins += 1 }
  async commit() { this.commits += 1 }
  async rollback() { this.rollbacks += 1 }
}

class RecordingEventCollector extends PlanningDomainEventCollector {
  events: PlanningDomainEvent[] = []

  override collect(
    input: Parameters<PlanningDomainEventCollector["collect"]>[0]
  ) {
    this.events = super.collect(input)
    return this.events
  }
}

function bootstrap() {
  return createWorkspace({
    id: workspaceId,
    companyId,
    initialSnapshotId: baseSnapshotId,
    allocatedInitialSnapshotVersion: 1,
    createdAt: occurredAt,
  })
}

function approvedScenario() {
  const scenario = createScenario({
    id: scenarioId,
    companyId,
    workspaceId,
    baseSnapshotId,
    name: "Cenário aprovado",
    createdAt: occurredAt,
  })
    .submit(new Date("2026-07-11T12:00:00Z"))
    .approve(new Date("2026-07-12T12:00:00Z"))

  return PlanningScenario.restore(scenario.toContract())
}

test("CreateWorkspaceHandler persiste bootstrap, coleta evento e retorna DTO", async () => {
  const workspaces = new MemoryWorkspaceRepository()
  const snapshots = new MemorySnapshotRepository()
  const unitOfWork = new RecordingUnitOfWork()
  const collector = new RecordingEventCollector()
  const handler = new CreateWorkspaceHandler(
    workspaces,
    snapshots,
    new InMemorySnapshotVersionAllocator(),
    unitOfWork,
    collector
  )

  const dto = await handler.execute({
    companyId,
    workspaceId,
    initialSnapshotId: baseSnapshotId,
    occurredAt,
  })

  assert.equal(workspaces.items.size, 1)
  assert.equal(snapshots.items.size, 1)
  assert.equal(dto.initialSnapshot.version, 1)
  assert.equal(dto.initialSnapshot.sourceScenarioId, null)
  assert.equal(typeof dto.createdAt, "string")
  assert.equal("toContract" in dto, false)
  assert.equal(Object.isFrozen(dto), true)
  assert.equal(collector.events[0]?.type, "planning.snapshot.published")
  assert.deepEqual(
    [unitOfWork.begins, unitOfWork.commits, unitOfWork.rollbacks],
    [1, 1, 0]
  )
})

test("CreateScenarioHandler carrega relações, persiste e retorna ScenarioDTO", async () => {
  const workspaces = new MemoryWorkspaceRepository()
  const scenarios = new MemoryScenarioRepository()
  const snapshots = new MemorySnapshotRepository()
  const foundation = bootstrap()
  workspaces.items.set(workspaceId, foundation.workspace)
  snapshots.items.set(baseSnapshotId, foundation.initialSnapshot)
  const collector = new RecordingEventCollector()
  const unitOfWork = new RecordingUnitOfWork()
  const handler = new CreateScenarioHandler(
    workspaces,
    scenarios,
    snapshots,
    unitOfWork,
    collector
  )

  const dto = await handler.execute({
    companyId,
    scenarioId,
    workspaceId,
    baseSnapshotId,
    name: "Cenário 2027",
    description: null,
    occurredAt,
  })

  assert.equal(dto.status, "draft")
  assert.equal(dto.baseSnapshotId, baseSnapshotId)
  assert.equal(typeof dto.createdAt, "string")
  assert.equal("domainEvents" in dto, false)
  assert.equal(collector.events[0]?.type, "planning.scenario.created")
  assert.equal(unitOfWork.commits, 1)
})

test("PublishScenarioHandler aloca versão, persiste ambos e retorna DTOs", async () => {
  const scenarios = new MemoryScenarioRepository()
  const snapshots = new MemorySnapshotRepository()
  const foundation = bootstrap()
  const scenario = approvedScenario()
  scenarios.items.set(scenario.id, scenario)
  snapshots.items.set(baseSnapshotId, foundation.initialSnapshot)
  const collector = new RecordingEventCollector()
  const unitOfWork = new RecordingUnitOfWork()
  const handler = new PublishScenarioHandler(
    scenarios,
    snapshots,
    new InMemorySnapshotVersionAllocator(
      new Map([[workspaceId, 1]])
    ),
    unitOfWork,
    collector
  )

  const dto = await handler.execute({
    companyId,
    scenarioId,
    snapshotId,
    expectedVersion: 3,
    occurredAt: new Date("2026-07-13T12:00:00Z"),
  })

  assert.equal(dto.scenario.status, "published")
  assert.equal(dto.snapshot.version, 2)
  assert.equal(dto.snapshot.sourceScenarioId, scenarioId)
  assert.deepEqual(scenarios.saveExpectedVersions, [3])
  assert.deepEqual(
    collector.events.map((event) => event.type),
    ["planning.scenario.published", "planning.snapshot.published"]
  )
  assert.equal(unitOfWork.commits, 1)
})

test("ArchiveScenarioHandler persiste com optimistic version e retorna DTO", async () => {
  const scenarios = new MemoryScenarioRepository()
  const scenario = PlanningScenario.restore(
    createScenario({
      id: scenarioId,
      companyId,
      workspaceId,
      baseSnapshotId,
      name: "Cenário",
      createdAt: occurredAt,
    }).toContract()
  )
  scenarios.items.set(scenarioId, scenario)
  const unitOfWork = new RecordingUnitOfWork()
  const collector = new RecordingEventCollector()
  const handler = new ArchiveScenarioHandler(
    scenarios,
    unitOfWork,
    collector
  )

  const dto = await handler.execute({
    companyId,
    scenarioId,
    expectedVersion: 1,
    occurredAt: new Date("2026-07-14T12:00:00Z"),
  })

  assert.equal(dto.status, "archived")
  assert.equal(dto.version, 2)
  assert.deepEqual(scenarios.saveExpectedVersions, [1])
  assert.equal(collector.events[0]?.type, "planning.scenario.archived")
})

test("handler executa rollback e não commit quando repository falha", async () => {
  const workspaces = new MemoryWorkspaceRepository()
  const snapshots = new MemorySnapshotRepository()
  snapshots.shouldFailCreate = true
  const unitOfWork = new RecordingUnitOfWork()
  const handler = new CreateWorkspaceHandler(
    workspaces,
    snapshots,
    new InMemorySnapshotVersionAllocator(),
    unitOfWork,
    new RecordingEventCollector()
  )

  await assert.rejects(() =>
    handler.execute({
      companyId,
      workspaceId,
      initialSnapshotId: baseSnapshotId,
      occurredAt,
    })
  )
  assert.deepEqual(
    [unitOfWork.begins, unitOfWork.commits, unitOfWork.rollbacks],
    [1, 0, 1]
  )
})

test("validação do command ocorre antes de iniciar transação", async () => {
  const unitOfWork = new RecordingUnitOfWork()
  const handler = new ArchiveScenarioHandler(
    new MemoryScenarioRepository(),
    unitOfWork,
    new RecordingEventCollector()
  )

  await assert.rejects(() =>
    handler.execute({
      companyId: "inválido",
      scenarioId,
      expectedVersion: 1,
      occurredAt,
    })
  )
  assert.equal(unitOfWork.begins, 0)
})

test("SnapshotVersionAllocator mantém sequências independentes", async () => {
  const allocator = new InMemorySnapshotVersionAllocator()

  assert.equal(await allocator.allocate(workspaceId), 1)
  assert.equal(await allocator.allocate(workspaceId), 2)
  assert.equal(
    await allocator.allocate("00000000-0000-4000-8000-000000000099"),
    1
  )
})

test("SimplePlanningUnitOfWork controla begin, commit e rollback", async () => {
  const committed = new SimplePlanningUnitOfWork()
  await committed.begin()
  assert.equal(committed.isActive, true)
  await committed.commit()
  assert.equal(committed.isActive, false)

  const rolledBack = new SimplePlanningUnitOfWork()
  await rolledBack.begin()
  await rolledBack.rollback()
  assert.equal(rolledBack.isActive, false)
  await assert.rejects(() => rolledBack.commit())
})

test("PlanningDomainEventCollector combina eventos sem publicá-los", () => {
  const foundation = bootstrap()
  const scenario = createScenario({
    id: scenarioId,
    companyId,
    workspaceId,
    baseSnapshotId,
    name: "Cenário",
    createdAt: occurredAt,
  })
  const collector = new PlanningDomainEventCollector()
  const events = collector.collect({
    workspace: foundation.workspace,
    scenario,
    snapshot: foundation.initialSnapshot,
  })

  assert.deepEqual(
    events.map((event) => event.type),
    ["planning.scenario.created", "planning.snapshot.published"]
  )
})
