import assert from "node:assert/strict"
import test from "node:test"

import { PlanningScenario } from "../planning-scenario"
import { PublishedSnapshot } from "../published-snapshot"
import { archiveScenario } from "../../services/archive-scenario"
import { createScenario } from "../../services/create-scenario"
import { createWorkspace } from "../../services/create-workspace"
import { incrementVersion } from "../../services/increment-version"
import { publishScenario } from "../../services/publish-scenario"

const companyId = "00000000-0000-4000-8000-000000000001"
const workspaceId = "00000000-0000-4000-8000-000000000002"
const baseSnapshotId = "00000000-0000-4000-8000-000000000003"
const scenarioId = "00000000-0000-4000-8000-000000000004"
const publishedSnapshotId = "00000000-0000-4000-8000-000000000005"
const secondScenarioId = "00000000-0000-4000-8000-000000000006"
const secondPublishedSnapshotId = "00000000-0000-4000-8000-000000000007"
const initialDate = new Date("2026-07-01T12:00:00.000Z")

function newScenario() {
  return createScenario({
    id: scenarioId,
    companyId,
    workspaceId,
    baseSnapshotId,
    name: "Cenário de crescimento",
    description: "Planejamento inicial",
    createdAt: initialDate,
  })
}

function baseSnapshot() {
  return createWorkspace({
    id: workspaceId,
    companyId,
    initialSnapshotId: baseSnapshotId,
    allocatedInitialSnapshotVersion: 1,
    createdAt: initialDate,
  }).initialSnapshot
}

test("cria workspace e estratégia explícita de snapshot inicial", () => {
  const bootstrap = createWorkspace({
    id: workspaceId,
    companyId,
    initialSnapshotId: baseSnapshotId,
    allocatedInitialSnapshotVersion: 1,
    createdAt: initialDate,
  })

  assert.equal(bootstrap.workspace.companyId, companyId)
  assert.equal(bootstrap.workspace.version, 1)
  assert.equal(bootstrap.workspace.id, workspaceId)
  assert.equal(bootstrap.initialSnapshot.id, baseSnapshotId)
  assert.equal(bootstrap.initialSnapshot.version, 1)
  assert.equal(bootstrap.initialSnapshot.sourceScenarioId, null)
  assert.equal(
    bootstrap.initialSnapshot.domainEvents[0]?.payload.bootstrap,
    true
  )
})

test("snapshot inicial exige a versão inicial reservada", () => {
  assert.throws(() =>
    PublishedSnapshot.bootstrap({
      id: baseSnapshotId,
      companyId,
      workspaceId,
      version: 2,
      publishedAt: initialDate,
    })
  )
})

test("cria cenário draft com snapshot base e evento", () => {
  const scenario = newScenario()

  assert.equal(scenario.companyId, companyId)
  assert.equal(scenario.workspaceId, workspaceId)
  assert.equal(scenario.baseSnapshotId, baseSnapshotId)
  assert.equal(scenario.status, "draft")
  assert.equal(scenario.version, 1)
  assert.equal(
    scenario.domainEvents[0]?.type,
    "planning.scenario.created"
  )
})

test("incrementa versão com inteiro positivo", () => {
  assert.equal(incrementVersion(1), 2)
  assert.equal(incrementVersion(9), 10)
  assert.throws(() => incrementVersion(0))
  assert.throws(() => incrementVersion(1.5))
})

test("executa transições e incrementa versão", () => {
  const submitted = newScenario().submit(
    new Date("2026-07-02T12:00:00.000Z")
  )
  const approved = submitted.approve(
    new Date("2026-07-03T12:00:00.000Z")
  )

  assert.equal(submitted.status, "submitted")
  assert.equal(submitted.version, 2)
  assert.equal(approved.status, "approved")
  assert.equal(approved.version, 3)
  assert.equal(newScenario().status, "draft")
})

test("valida transições submitted, approved e rejected", () => {
  assert.throws(() =>
    newScenario().approve(new Date("2026-07-02T12:00:00Z"))
  )
  assert.throws(() =>
    newScenario().reject(new Date("2026-07-02T12:00:00Z"))
  )

  const rejected = newScenario()
    .submit(new Date("2026-07-02T12:00:00Z"))
    .reject(new Date("2026-07-03T12:00:00Z"))

  assert.equal(rejected.status, "rejected")
})

test("não publica cenário draft", () => {
  assert.throws(() =>
    publishScenario(newScenario(), {
      snapshotId: publishedSnapshotId,
      baseSnapshot: baseSnapshot(),
      allocatedSnapshotVersion: 2,
      occurredAt: new Date("2026-07-04T12:00:00Z"),
    })
  )
})

test("publica cenário aprovado e cria snapshot imutável", () => {
  const approved = newScenario()
    .submit(new Date("2026-07-02T12:00:00Z"))
    .approve(new Date("2026-07-03T12:00:00Z"))
  const result = publishScenario(approved, {
    snapshotId: publishedSnapshotId,
    baseSnapshot: baseSnapshot(),
    allocatedSnapshotVersion: 2,
    occurredAt: new Date("2026-07-04T12:00:00Z"),
  })

  assert.equal(result.scenario.status, "published")
  assert.equal(result.scenario.version, 4)
  assert.equal(result.snapshot.companyId, companyId)
  assert.equal(result.snapshot.sourceScenarioId, scenarioId)
  assert.equal(result.snapshot.version, 2)
  assert.equal(
    result.snapshot.domainEvents[0]?.type,
    "planning.snapshot.published"
  )
  assert.equal(Object.isFrozen(result.snapshot.toContract()), true)
})

test("não edita nem arquiva cenário published", () => {
  const published = PlanningScenario.restore({
    ...newScenario().toContract(),
    status: "published",
    version: 4,
  })

  assert.throws(() =>
    published.updateDetails(
      "Outro nome",
      null,
      new Date("2026-07-05T12:00:00Z")
    )
  )
  assert.throws(() =>
    archiveScenario(
      published,
      new Date("2026-07-05T12:00:00Z")
    )
  )
})

test("publicação valida snapshot-base e isolamento por empresa", () => {
  const approved = newScenario()
    .submit(new Date("2026-07-02T12:00:00Z"))
    .approve(new Date("2026-07-03T12:00:00Z"))
  const foreignSnapshot = PublishedSnapshot.restore({
    ...baseSnapshot().toContract(),
    companyId: "00000000-0000-4000-8000-000000000099",
  })

  assert.throws(() =>
    publishScenario(approved, {
      snapshotId: publishedSnapshotId,
      baseSnapshot: foreignSnapshot,
      allocatedSnapshotVersion: 2,
      occurredAt: new Date("2026-07-04T12:00:00Z"),
    })
  )
})

test("dois cenários do mesmo snapshot usam versões alocadas diferentes", () => {
  const first = newScenario()
    .submit(new Date("2026-07-02T12:00:00Z"))
    .approve(new Date("2026-07-03T12:00:00Z"))
  const second = createScenario({
    id: secondScenarioId,
    companyId,
    workspaceId,
    baseSnapshotId,
    name: "Segundo cenário",
    createdAt: initialDate,
  })
    .submit(new Date("2026-07-02T12:00:00Z"))
    .approve(new Date("2026-07-03T12:00:00Z"))

  const firstResult = publishScenario(first, {
    snapshotId: publishedSnapshotId,
    baseSnapshot: baseSnapshot(),
    allocatedSnapshotVersion: 2,
    occurredAt: new Date("2026-07-04T12:00:00Z"),
  })
  const secondResult = publishScenario(second, {
    snapshotId: secondPublishedSnapshotId,
    baseSnapshot: baseSnapshot(),
    allocatedSnapshotVersion: 3,
    occurredAt: new Date("2026-07-04T13:00:00Z"),
  })

  assert.equal(firstResult.snapshot.version, 2)
  assert.equal(secondResult.snapshot.version, 3)
  assert.equal(firstResult.snapshot.sourceScenarioId, scenarioId)
  assert.equal(secondResult.snapshot.sourceScenarioId, secondScenarioId)
})

test("valida que a versão alocada seja posterior ao snapshot-base", () => {
  const approved = newScenario()
    .submit(new Date("2026-07-02T12:00:00Z"))
    .approve(new Date("2026-07-03T12:00:00Z"))

  assert.throws(() =>
    publishScenario(approved, {
      snapshotId: publishedSnapshotId,
      baseSnapshot: baseSnapshot(),
      allocatedSnapshotVersion: 1,
      occurredAt: new Date("2026-07-04T12:00:00Z"),
    })
  )
  assert.throws(() =>
    publishScenario(approved, {
      snapshotId: publishedSnapshotId,
      baseSnapshot: baseSnapshot(),
      allocatedSnapshotVersion: 0,
      occurredAt: new Date("2026-07-04T12:00:00Z"),
    })
  )
})

test("arquiva cenário não publicado sem alterar original", () => {
  const scenario = newScenario()
  const archived = archiveScenario(
    scenario,
    new Date("2026-07-05T12:00:00Z")
  )

  assert.equal(scenario.status, "draft")
  assert.equal(scenario.version, 1)
  assert.equal(archived.status, "archived")
  assert.equal(archived.version, 2)
  assert.equal(
    archived.domainEvents.at(-1)?.type,
    "planning.scenario.archived"
  )
})

test("restore não recria eventos históricos", () => {
  const scenario = PlanningScenario.restore(
    newScenario().toContract()
  )
  const snapshot = PublishedSnapshot.restore(
    baseSnapshot().toContract()
  )

  assert.deepEqual(scenario.domainEvents, [])
  assert.deepEqual(snapshot.domainEvents, [])
})

test("schemas rejeitam identificadores e nomes inválidos", () => {
  assert.throws(() =>
    createWorkspace({
      id: "inválido",
      companyId,
      initialSnapshotId: baseSnapshotId,
      allocatedInitialSnapshotVersion: 1,
      createdAt: initialDate,
    })
  )
  assert.throws(() =>
    createScenario({
      id: scenarioId,
      companyId,
      workspaceId,
      baseSnapshotId,
      name: "x",
      createdAt: initialDate,
    })
  )
})
