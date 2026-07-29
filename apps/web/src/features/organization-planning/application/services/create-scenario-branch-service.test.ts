import assert from "node:assert/strict"
import test from "node:test"

import { PlanningScenario } from "../../domain/planning-scenario"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import type { ScenarioBranchApplicationRepository } from "../ports"
import { CreateScenarioBranchService } from "./create-scenario-branch-service"

const companyId = "00000000-0000-4000-8000-000000000001"
const workspaceId = "00000000-0000-4000-8000-000000000002"
const baselineId = "00000000-0000-4000-8000-000000000003"
const rootId = "00000000-0000-4000-8000-000000000004"
const branchId = "00000000-0000-4000-8000-000000000005"
const nestedBranchId = "00000000-0000-4000-8000-000000000006"
const createdAt = new Date("2026-08-01T12:00:00.000Z")

test("creates root scenarios with canonical branch metadata", () => {
  const root = createRoot()

  assert.equal(root.parentScenarioId, null)
  assert.equal(root.branchDepth, 0)
  assert.equal(root.branchPath, rootId)
})

test("branches a scenario by copying metadata and reusing its Baseline", async () => {
  const repository = new MemoryScenarioBranchRepository([createRoot()])
  const collector = new PlanningDomainEventCollector()
  const service = new CreateScenarioBranchService(repository, collector)

  const result = await service.execute({
    companyId,
    sourceScenarioId: rootId,
    scenarioId: branchId,
    occurredAt: createdAt,
  })

  assert.equal(result.id, branchId)
  assert.equal(result.workspaceId, workspaceId)
  assert.equal(result.baseSnapshotId, baselineId)
  assert.equal(result.name, "Expansão regional")
  assert.equal(result.description, "Cenário principal")
  assert.equal(result.status, "draft")
  assert.equal(result.version, 1)
  assert.equal(result.parentScenarioId, rootId)
  assert.equal(result.branchDepth, 1)
  assert.equal(result.branchPath, `${rootId}/${branchId}`)
  assert.equal(repository.created.length, 1)
  assert.equal(repository.created[0]?.id, branchId)
  assert.equal(repository.created[0]?.domainEvents[0]?.payload.parentScenarioId, rootId)
})

test("creates deterministic nested branch paths for multiple levels", async () => {
  const repository = new MemoryScenarioBranchRepository([createRoot()])
  const service = new CreateScenarioBranchService(
    repository,
    new PlanningDomainEventCollector()
  )

  await service.execute({
    companyId,
    sourceScenarioId: rootId,
    scenarioId: branchId,
    occurredAt: createdAt,
  })
  const nested = await service.execute({
    companyId,
    sourceScenarioId: branchId,
    scenarioId: nestedBranchId,
    occurredAt: new Date("2026-08-02T12:00:00.000Z"),
  })

  assert.equal(nested.parentScenarioId, branchId)
  assert.equal(nested.branchDepth, 2)
  assert.equal(nested.branchPath, `${rootId}/${branchId}/${nestedBranchId}`)
  assert.equal(repository.created.length, 2)
})

test("produces the same branch for the same source and explicit inputs", () => {
  const root = createRoot()
  const first = root.createBranch({ id: branchId, createdAt })
  const second = root.createBranch({ id: branchId, createdAt })

  assert.deepEqual(first.toContract(), second.toContract())
  assert.deepEqual(first.domainEvents, second.domainEvents)
  assert.equal(root.branchDepth, 0)
  assert.equal(root.branchPath, rootId)
})

test("rejects a missing source and equal source/branch identifiers", async () => {
  const repository = new MemoryScenarioBranchRepository([])
  const service = new CreateScenarioBranchService(
    repository,
    new PlanningDomainEventCollector()
  )

  await assert.rejects(
    service.execute({
      companyId,
      sourceScenarioId: rootId,
      scenarioId: branchId,
      occurredAt: createdAt,
    }),
    /Cenário de origem não encontrado/
  )
  await assert.rejects(
    service.execute({
      companyId,
      sourceScenarioId: rootId,
      scenarioId: rootId,
      occurredAt: createdAt,
    }),
    /O novo cenário deve possuir um identificador diferente da origem/
  )
  assert.equal(repository.created.length, 0)
})

test("rejects inconsistent restored branch metadata", () => {
  assert.throws(() =>
    PlanningScenario.restore({
      ...createRoot().toContract(),
      parentScenarioId: rootId,
      branchDepth: 0,
      branchPath: `${rootId}/${branchId}`,
    })
  )
  assert.throws(() =>
    PlanningScenario.restore({
      ...createRoot().toContract(),
      id: branchId,
      parentScenarioId: rootId,
      branchDepth: 1,
      branchPath: rootId,
    })
  )
})

function createRoot(): PlanningScenario {
  return PlanningScenario.create({
    id: rootId,
    companyId,
    workspaceId,
    baseSnapshotId: baselineId,
    name: "Expansão regional",
    description: "Cenário principal",
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
  })
}

class MemoryScenarioBranchRepository
  implements ScenarioBranchApplicationRepository {
  readonly created: PlanningScenario[] = []
  private readonly scenarios = new Map<string, PlanningScenario>()

  constructor(initial: readonly PlanningScenario[]) {
    for (const scenario of initial) this.scenarios.set(scenario.id, scenario)
  }

  async findById(receivedCompanyId: string, scenarioId: string) {
    const scenario = this.scenarios.get(scenarioId) ?? null
    return scenario?.companyId === receivedCompanyId ? scenario : null
  }

  async createBranch(scenario: PlanningScenario) {
    if (this.scenarios.has(scenario.id)) throw new Error("SCENARIO_ALREADY_EXISTS")
    this.scenarios.set(scenario.id, scenario)
    this.created.push(scenario)
  }
}
