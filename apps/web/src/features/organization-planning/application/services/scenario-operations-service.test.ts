import assert from "node:assert/strict"
import test from "node:test"

import { PlanningScenario } from "../../domain/planning-scenario"
import type { ScenarioOperationsApplicationRepository } from "../ports"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import { ScenarioOperationsService } from "./scenario-operations-service"

const companyId = "00000000-0000-4000-8000-000000000001"
const scenarioId = "00000000-0000-4000-8000-000000000002"
const occurredAt = new Date("2026-08-01T12:00:00.000Z")

test("deletes a draft with its owned Change Sets", async () => {
  const repository = new MemoryOperationsRepository(createScenario(), { changeSets: 2 })
  await createService(repository).delete({ companyId, scenarioId, expectedVersion: 1 })
  assert.equal(repository.deleted, true)
  assert.equal(repository.changeSets, 0)
})

test("renames through the trusted repository with expected_version", async () => {
  const repository = new MemoryOperationsRepository(createScenario())
  const renamed = await createService(repository).rename({ companyId, scenarioId, expectedVersion: 1, name: "Cenário revisado", occurredAt })
  assert.equal(renamed.name, "Cenário revisado")
  assert.equal(renamed.version, 2)
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
  constructor(private scenario: PlanningScenario, refs: { changeSets?: number } = {}) {
    this.changeSets = refs.changeSets ?? 0
  }
  async findById(receivedCompanyId: string, receivedScenarioId: string) {
    return !this.deleted && receivedCompanyId === companyId && receivedScenarioId === scenarioId ? this.scenario : null
  }
  async create(scenario: PlanningScenario) { return scenario }
  async save(scenario: PlanningScenario, expectedVersion: number) {
    assert.equal(this.scenario.version, expectedVersion)
    this.scenario = scenario
  }
  async rename(_scenarioId: string, expectedVersion: number, name: string) {
    assert.equal(this.scenario.version, expectedVersion)
    this.scenario = this.scenario.rename(name, occurredAt)
    return this.scenario
  }
  async deleteDraft(_companyId: string, _scenarioId: string, expectedVersion: number) {
    assert.equal(this.scenario.status, "draft")
    assert.equal(this.scenario.version, expectedVersion)
    this.changeSets = 0
    this.deleted = true
  }
}
