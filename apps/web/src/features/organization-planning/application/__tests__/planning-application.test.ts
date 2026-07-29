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
import { PlanningScenarioProjectionError } from "../handlers/planning-handler-support"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import type {
  ScenarioApplicationRepository,
  WorkspaceApplicationRepository,
} from "../ports/planning-repository-ports"
import type { PlanningChangeSetRepository } from "../ports/planning-change-set-repository"
import type { PlanningProjectionSnapshotRepository } from "../ports/planning-projection-snapshot-repository"
import type {
  CreatePlanningBaselineInput,
  PlanningBaselineRepository,
} from "../ports/planning-baseline-repository"
import type {
  PlanningOperationalOrganization,
  PlanningOperationalOrganizationSource,
} from "../ports/planning-operational-organization-source"
import type {
  PlanningPublicationRepository,
  PlanningPublicationResult,
  PublishPlanningScenarioInput,
} from "../ports/planning-publication-repository"
import { InMemorySnapshotVersionAllocator } from "../ports/snapshot-version-allocator"
import {
  SimplePlanningUnitOfWork,
  type PlanningUnitOfWork,
} from "../transactions/planning-unit-of-work"
import type { OrganizationPlanningWorkspace } from "../../domain/organization-planning-workspace"
import type { PlanningDomainEvent } from "../../events/planning-domain-event"
import {
  ScenarioExecutor,
  createEmptyProjectedOrganization,
  freezeProjectedOrganization,
  type ProjectionSnapshot,
  type ProjectedOrganization,
} from "../../projection"
import type { ChangeSet } from "../../types/planning-contracts"

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

class MemoryPlanningPublicationRepository
  implements PlanningPublicationRepository
{
  inputs: PublishPlanningScenarioInput[] = []

  constructor(
    private readonly result: PlanningPublicationResult
  ) {}

  async publish(input: PublishPlanningScenarioInput) {
    this.inputs.push(input)
    return this.result
  }
}

class MemoryProjectionSnapshotRepository
  implements PlanningProjectionSnapshotRepository
{
  readonly items = new Map<string, ProjectionSnapshot>()

  async findProjectionById(company: string, id: string) {
    const snapshot = this.items.get(id) ?? null
    return snapshot?.companyId === company ? snapshot : null
  }
}

class MemoryChangeSetRepository
  implements PlanningChangeSetRepository
{
  readonly items: ChangeSet[] = []
  listInputs: { companyId: string; scenarioId: string }[] = []

  async create(changeSet: ChangeSet) {
    this.items.push(changeSet)
  }

  async listPublishableByScenario(input: {
    companyId: string
    scenarioId: string
  }) {
    this.listInputs.push(input)
    return this.items.filter(
      (changeSet) =>
        changeSet.companyId === input.companyId &&
        changeSet.scenarioId === input.scenarioId
    )
  }
}

class MemoryBaselineRepository
  implements PlanningBaselineRepository
{
  exists = false
  shouldFailCreate = false
  inputs: CreatePlanningBaselineInput[] = []

  async existsBaselineByCompany() {
    return this.exists
  }

  async create(input: CreatePlanningBaselineInput) {
    if (this.shouldFailCreate) throw new Error("baseline failure")
    this.inputs.push(input)
    this.exists = true
  }
}

class StaticOperationalOrganizationSource
  implements PlanningOperationalOrganizationSource
{
  constructor(
    private readonly organization: PlanningOperationalOrganization =
      operationalOrganization()
  ) {}

  async loadByCompany() {
    return this.organization
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

function operationalOrganization(): PlanningOperationalOrganization {
  return Object.freeze({
    departments: Object.freeze([{
      id: "department-1",
      name: "Operações",
      code: "OPS",
      description: null,
      parentDepartmentId: null,
    }]),
    teams: Object.freeze([{
      id: "team-1",
      name: "Plataforma",
      code: null,
      description: null,
      departmentId: "department-1",
    }]),
    positions: Object.freeze([{
      id: "position-1",
      name: "Analista",
      description: null,
      departmentId: "department-1",
      hierarchicalLevel: "analyst",
      weeklyWorkloadHours: 40,
      workModel: "hybrid",
      employmentType: "clt",
      travelRequirement: "none",
      active: true,
    }]),
    employees: Object.freeze([{
      id: "employee-1",
      positionId: "position-1",
    }]),
  })
}

function organizationWithDepartment(
  name: string
): ProjectedOrganization {
  return freezeProjectedOrganization({
    ...createEmptyProjectedOrganization(),
    departments: [{
      id: "department-1",
      name,
      code: null,
      description: null,
      parentDepartmentId: null,
      status: "active",
    }],
    metrics: {
      ...createEmptyProjectedOrganization().metrics,
      departments: 1,
    },
  })
}

function organizationWithPosition(): ProjectedOrganization {
  return freezeProjectedOrganization({
    ...createEmptyProjectedOrganization(),
    departments: [
      {
        id: "department-1",
        name: "Operações",
        code: null,
        description: null,
        parentDepartmentId: null,
        status: "active",
      },
      {
        id: "department-2",
        name: "Financeiro",
        code: null,
        description: null,
        parentDepartmentId: null,
        status: "active",
      },
    ],
    positions: [{
      id: "position-1",
      name: "Analista",
      description: null,
      departmentId: "department-1",
      hierarchicalLevel: "analyst",
      weeklyWorkloadHours: 40,
      workModel: "hybrid",
      employmentType: "clt",
      travelRequirement: "none",
      status: "active",
    }],
    metrics: {
      ...createEmptyProjectedOrganization().metrics,
      departments: 2,
      positions: 1,
    },
  })
}

function projectionSnapshot(
  organization: ProjectedOrganization
): ProjectionSnapshot {
  return Object.freeze({
    ...bootstrap().initialSnapshot.toContract(),
    organization,
  })
}

function changeSet(
  id: string,
  changeType: string,
  payload: Readonly<Record<string, unknown>>,
  version = 1
): ChangeSet {
  return Object.freeze({
    id,
    companyId,
    scenarioId,
    changeType,
    payload: Object.freeze({ ...payload }),
    version,
  })
}

function publishCommand() {
  return {
    companyId,
    scenarioId,
    snapshotId,
    expectedVersion: 3,
    occurredAt,
  }
}

function publicationDependencies(changeSetsInput: readonly ChangeSet[]) {
  const scenarios = new MemoryScenarioRepository()
  scenarios.items.set(scenarioId, approvedScenario())
  const snapshots = new MemoryProjectionSnapshotRepository()
  snapshots.items.set(
    baseSnapshotId,
    projectionSnapshot(organizationWithDepartment("Operações"))
  )
  const changeSets = new MemoryChangeSetRepository()
  changeSets.items.push(...changeSetsInput)
  const projectedOrganization = organizationWithDepartment("Operações")
  const publishedAt = occurredAt
  const publication = new MemoryPlanningPublicationRepository({
    scenario: approvedScenario().publish(publishedAt),
    snapshot: PublishedSnapshot.publish({
      id: snapshotId,
      companyId,
      workspaceId,
      sourceScenarioId: scenarioId,
      version: 2,
      publishedAt,
    }),
    organization: projectedOrganization,
  })
  const collector = new RecordingEventCollector()
  const handler = new PublishScenarioHandler(
    scenarios,
    snapshots,
    changeSets,
    ScenarioExecutor.create(() => occurredAt.getTime()),
    publication,
    collector
  )

  return {
    handler,
    publication,
    collector,
    snapshots,
  }
}

test("CreateWorkspaceHandler persists the operational organization as the Baseline", async () => {
  const baseline = new MemoryBaselineRepository()
  const collector = new RecordingEventCollector()
  const handler = new CreateWorkspaceHandler(
    baseline,
    new StaticOperationalOrganizationSource(),
    collector
  )

  const dto = await handler.execute({
    companyId,
    workspaceId,
    initialSnapshotId: baseSnapshotId,
    occurredAt,
  })

  assert.equal(baseline.inputs.length, 1)
  assert.equal(dto.initialSnapshot.version, 1)
  assert.equal(dto.initialSnapshot.sourceScenarioId, null)
  assert.equal(dto.initialSnapshot.kind, "baseline")
  assert.equal(
    baseline.inputs[0]?.organization.departments[0]?.name,
    "Operações"
  )
  assert.equal(baseline.inputs[0]?.organization.employees.length, 1)
  assert.equal(baseline.inputs[0]?.organization.metrics.headcount, 1)
  assert.equal(typeof dto.createdAt, "string")
  assert.equal("toContract" in dto, false)
  assert.equal(Object.isFrozen(dto), true)
  assert.equal(collector.events[0]?.type, "planning.snapshot.published")
})

test("CreateWorkspaceHandler rejects a second Workspace for the same Company before loading organization", async () => {
  const baseline = new MemoryBaselineRepository()
  baseline.exists = true
  let loads = 0
  const source: PlanningOperationalOrganizationSource = {
    async loadByCompany() {
      loads += 1
      return operationalOrganization()
    },
  }
  const handler = new CreateWorkspaceHandler(
    baseline,
    source,
    new RecordingEventCollector()
  )

  await assert.rejects(() => handler.execute({
    companyId,
    workspaceId: "00000000-0000-4000-8000-000000000099",
    initialSnapshotId: "00000000-0000-4000-8000-000000000098",
    occurredAt,
  }))
  assert.equal(loads, 0)
  assert.equal(baseline.inputs.length, 0)
})

test("CreateScenarioHandler carrega relações, persiste e retorna ScenarioDTO", async () => {
  const workspaces = new MemoryWorkspaceRepository()
  const scenarios = new MemoryScenarioRepository()
  const snapshots = new MemoryProjectionSnapshotRepository()
  const foundation = bootstrap()
  workspaces.items.set(workspaceId, foundation.workspace)
  snapshots.items.set(
    baseSnapshotId,
    projectionSnapshot(organizationWithDepartment("Operações"))
  )
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

test("CreateScenarioHandler rejects a Workspace without a Baseline tree", async () => {
  const workspaces = new MemoryWorkspaceRepository()
  const scenarios = new MemoryScenarioRepository()
  const snapshots = new MemoryProjectionSnapshotRepository()
  const foundation = bootstrap()
  workspaces.items.set(workspaceId, foundation.workspace)
  snapshots.items.set(baseSnapshotId, Object.freeze({
    ...foundation.initialSnapshot.toContract(),
    kind: null,
  }))
  const unitOfWork = new RecordingUnitOfWork()
  const handler = new CreateScenarioHandler(
    workspaces,
    scenarios,
    snapshots,
    unitOfWork,
    new RecordingEventCollector()
  )

  await assert.rejects(() => handler.execute({
    companyId,
    scenarioId,
    workspaceId,
    baseSnapshotId,
    name: "Cenário sem baseline",
    occurredAt,
  }))
  assert.equal(scenarios.items.size, 0)
  assert.equal(unitOfWork.rollbacks, 1)
})

test("PublishScenarioHandler delega publicação atômica e retorna DTOs", async () => {
  const publishedAt = new Date("2026-07-13T12:00:00Z")
  const scenario = approvedScenario().publish(publishedAt)
  const snapshot = PublishedSnapshot.publish({
    id: snapshotId,
    companyId,
    workspaceId,
    sourceScenarioId: scenarioId,
    version: 2,
    publishedAt,
  })
  const publication = new MemoryPlanningPublicationRepository({
    scenario,
    snapshot,
    organization: organizationWithDepartment("Financeiro"),
  })
  const scenarios = new MemoryScenarioRepository()
  scenarios.items.set(scenarioId, approvedScenario())
  const snapshots = new MemoryProjectionSnapshotRepository()
  snapshots.items.set(
    baseSnapshotId,
    projectionSnapshot(organizationWithDepartment("Operações"))
  )
  const changeSets = new MemoryChangeSetRepository()
  changeSets.items.push(changeSet(
    "00000000-0000-4000-8000-000000000006",
    "department.update",
    { departmentId: "department-1", name: "Financeiro" }
  ))
  const collector = new RecordingEventCollector()
  const handler = new PublishScenarioHandler(
    scenarios,
    snapshots,
    changeSets,
    ScenarioExecutor.create(() => occurredAt.getTime()),
    publication,
    collector
  )

  const dto = await handler.execute({
    companyId,
    scenarioId,
    snapshotId,
    expectedVersion: 3,
    occurredAt: publishedAt,
  })

  assert.equal(dto.scenario.status, "published")
  assert.equal(dto.snapshot.version, 2)
  assert.equal(dto.snapshot.sourceScenarioId, scenarioId)
  const canonicalChangeSets = [...changeSets.items]
  assert.deepEqual(publication.inputs, [{
    companyId,
    scenarioId,
    snapshotId,
    expectedVersion: 3,
    publishedAt,
    organization: organizationWithDepartment("Financeiro"),
    changeSets: canonicalChangeSets,
  }])
  assert.deepEqual(changeSets.listInputs, [{ companyId, scenarioId }])
  assert.deepEqual(
    collector.events.map((event) => event.type),
    ["planning.scenario.published", "planning.snapshot.published"]
  )
})

test("PublishScenarioHandler não publica projeção com Change Set unhandled", async () => {
  const dependencies = publicationDependencies([
    changeSet(
      "00000000-0000-4000-8000-000000000006",
      "employee.create",
      { employeeId: "employee-1" }
    ),
  ])

  await assert.rejects(
    () => dependencies.handler.execute(publishCommand()),
    (error) => {
      assert.equal(error instanceof PlanningScenarioProjectionError, true)
      assert.equal(
        (error as PlanningScenarioProjectionError).failures[0]?.code,
        "planning.change_set.not_executed"
      )
      return true
    }
  )
  assert.equal(dependencies.publication.inputs.length, 0)
  assert.deepEqual(dependencies.collector.events, [])
})

test("PublishScenarioHandler não publica quando a projeção falha", async () => {
  const dependencies = publicationDependencies([
    changeSet(
      "00000000-0000-4000-8000-000000000006",
      "department.update",
      { departmentId: "missing", name: "Financeiro" }
    ),
  ])

  await assert.rejects(
    () => dependencies.handler.execute(publishCommand()),
    PlanningScenarioProjectionError
  )
  assert.equal(dependencies.publication.inputs.length, 0)
  assert.deepEqual(dependencies.collector.events, [])
})

test("PublishScenarioHandler rejeita snapshot legado sem organização", async () => {
  const dependencies = publicationDependencies([])
  dependencies.snapshots.items.set(baseSnapshotId, {
    ...bootstrap().initialSnapshot.toContract(),
  })

  await assert.rejects(
    () => dependencies.handler.execute(publishCommand()),
    (error) => {
      assert.equal(error instanceof PlanningScenarioProjectionError, true)
      assert.equal(
        (error as PlanningScenarioProjectionError).failures[0]?.code,
        "planning.snapshot.organization_missing"
      )
      return true
    }
  )
  assert.equal(dependencies.publication.inputs.length, 0)
})

test("PublishScenarioHandler projects hydrated changes canonically without mutating the snapshot", async () => {
  const baseOrganization = organizationWithPosition()
  const dependencies = publicationDependencies([
    changeSet(
      "00000000-0000-4000-8000-000000000007",
      "department.update",
      { departmentId: "department-1", name: "Operações Globais" },
      2
    ),
    changeSet(
      "00000000-0000-4000-8000-000000000006",
      "position.move",
      { positionId: "position-1", departmentId: "department-2" },
      1
    ),
  ])
  dependencies.snapshots.items.set(
    baseSnapshotId,
    projectionSnapshot(baseOrganization)
  )
  const original = structuredClone(baseOrganization)

  await dependencies.handler.execute(publishCommand())

  const persisted = dependencies.publication.inputs[0]?.organization
  assert.equal(persisted?.positions[0]?.departmentId, "department-2")
  assert.equal(persisted?.departments[0]?.name, "Operações Globais")
  assert.deepEqual(baseOrganization, original)

  const second = publicationDependencies([
    changeSet(
      "00000000-0000-4000-8000-000000000007",
      "department.update",
      { departmentId: "department-1", name: "Operações Globais" },
      2
    ),
    changeSet(
      "00000000-0000-4000-8000-000000000006",
      "position.move",
      { positionId: "position-1", departmentId: "department-2" },
      1
    ),
  ])
  second.snapshots.items.set(
    baseSnapshotId,
    projectionSnapshot(baseOrganization)
  )
  await second.handler.execute(publishCommand())

  assert.deepEqual(
    second.publication.inputs[0]?.organization,
    persisted
  )
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

test("CreateWorkspaceHandler does not collect events when Baseline persistence fails", async () => {
  const baseline = new MemoryBaselineRepository()
  baseline.shouldFailCreate = true
  const collector = new RecordingEventCollector()
  const handler = new CreateWorkspaceHandler(
    baseline,
    new StaticOperationalOrganizationSource(),
    collector
  )

  await assert.rejects(() =>
    handler.execute({
      companyId,
      workspaceId,
      initialSnapshotId: baseSnapshotId,
      occurredAt,
    })
  )
  assert.deepEqual(collector.events, [])
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
