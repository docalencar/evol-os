import assert from "node:assert/strict"
import test from "node:test"

import { PlanningScenario } from "../../domain/planning-scenario"
import type { ScenarioOperationsApplicationRepository } from "../ports"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import { ScenarioOperationsService } from "./scenario-operations-service"

const companyId = "00000000-0000-4000-8000-000000000001"
const scenarioId = "00000000-0000-4000-8000-000000000002"
const occurredAt = new Date("2026-08-01T12:00:00.000Z")

test("blocks deletion when the scenario has a child", async () => {
  const repository = new MemoryOperationsRepository(createScenario(), { children: true })
  await assert.rejects(createService(repository).delete({ companyId, scenarioId, expectedVersion: 1 }), /cenários derivados/)
  assert.equal(repository.deleted, false)
})

test("blocks deletion when a published snapshot references the scenario", async () => {
  const repository = new MemoryOperationsRepository(createScenario(), { snapshot: true })
  await assert.rejects(createService(repository).delete({ companyId, scenarioId, expectedVersion: 1 }), /snapshot publicado/)
  assert.equal(repository.deleted, false)
})

test("deletes a draft with its owned Change Sets", async () => {
  const repository = new MemoryOperationsRepository(createScenario(), { changeSets: 2 })
  await createService(repository).delete({ companyId, scenarioId, expectedVersion: 1 })
  assert.equal(repository.deleted, true)
  assert.equal(repository.changeSets, 0)
})

test("rejects direct deletion of an archived scenario", async () => {
  const repository = new MemoryOperationsRepository(createScenario().archive(occurredAt))
  await assert.rejects(createService(repository).delete({ companyId, scenarioId, expectedVersion: 2 }), /rascunho/)
  assert.equal(repository.deleted, false)
})

test("allows restoration followed by deletion", async () => {
  const repository = new MemoryOperationsRepository(createScenario().archive(occurredAt))
  const service = createService(repository)
  const restored = await service.restore({ companyId, scenarioId, expectedVersion: 2, occurredAt: new Date("2026-08-02T12:00:00.000Z") })
  assert.equal(restored.status, "draft")
  await service.delete({ companyId, scenarioId, expectedVersion: restored.version })
  assert.equal(repository.deleted, true)
})

function createScenario() {
  return PlanningScenario.create({
    id: scenarioId, companyId,
    workspaceId: "00000000-0000-4000-8000-000000000003",
    baseSnapshotId: "00000000-0000-4000-8000-000000000004",
    name: "Cenário", createdAt: new Date("2026-07-01T12:00:00.000Z"),
  })
}

function createService(repository: MemoryOperationsRepository) {
  return new ScenarioOperationsService(repository, new PlanningDomainEventCollector())
}

class MemoryOperationsRepository implements ScenarioOperationsApplicationRepository {
  deleted = false
  changeSets: number
  constructor(private scenario: PlanningScenario, private readonly refs: { children?: boolean; snapshot?: boolean; changeSets?: number } = {}) {
    this.changeSets = refs.changeSets ?? 0
  }
  async findById(receivedCompanyId: string, receivedScenarioId: string) {
    return !this.deleted && receivedCompanyId === companyId && receivedScenarioId === scenarioId ? this.scenario : null
  }
  async create() {}
  async save(scenario: PlanningScenario, expectedVersion: number) {
    assert.equal(this.scenario.version, expectedVersion)
    this.scenario = scenario
  }
  async hasChildren() { return this.refs.children ?? false }
  async hasPublishedSnapshot() { return this.refs.snapshot ?? false }
  async deleteDraft(_companyId: string, _scenarioId: string, expectedVersion: number) {
    assert.equal(this.scenario.status, "draft")
    assert.equal(this.scenario.version, expectedVersion)
    this.changeSets = 0
    this.deleted = true
  }
}
