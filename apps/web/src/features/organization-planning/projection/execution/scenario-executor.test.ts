import assert from "node:assert/strict"
import test from "node:test"
import type {
  ChangeSet,
  PlanningScenarioContract,
  PublishedSnapshotContract,
} from "../../types/planning-contracts"
import { ScenarioExecutor, type ExecutionClock } from "./scenario-executor"

const snapshot: PublishedSnapshotContract = Object.freeze({
  id: "snapshot-1",
  companyId: "company-1",
  workspaceId: "workspace-1",
  sourceScenarioId: null,
  version: 1,
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
})

const scenario: PlanningScenarioContract = Object.freeze({
  id: "scenario-1",
  companyId: "company-1",
  workspaceId: "workspace-1",
  baseSnapshotId: "snapshot-1",
  name: "Cenário",
  description: null,
  status: "draft",
  version: 1,
  createdAt: new Date("2026-01-02T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
})

function changeSet(
  id: string,
  version: number,
  changeType: string,
  payload: Readonly<Record<string, unknown>>
): ChangeSet {
  return Object.freeze({
    id,
    companyId: "company-1",
    scenarioId: "scenario-1",
    changeType,
    payload: Object.freeze({ ...payload }),
    version,
  })
}

function createDepartment(
  id: string,
  version: number,
  departmentId: string,
  name: string
): ChangeSet {
  return changeSet(id, version, "department.create", {
    departmentId,
    name,
  })
}

function sequentialClock(
  values: readonly number[]
): ExecutionClock {
  let index = 0

  return () =>
    values[Math.min(index++, values.length - 1)] ?? 0
}

test("ScenarioExecutor executes an empty scenario", () => {
  const result = ScenarioExecutor.create().execute({
    snapshot,
    scenario,
    changeSets: [],
  })

  assert.deepEqual(result.organization.departments, [])
  assert.deepEqual(result.issues, [])
  assert.deepEqual(result.warnings, [])
  assert.deepEqual(result.executedChangeSets, [])
  assert.deepEqual(result.metrics, {
    headcount: 0,
    vacancies: 0,
    salaryMass: 0,
    departments: 0,
    positions: 0,
  })
  assert.equal(result.generatedAt instanceof Date, true)
  assert.equal(typeof result.duration, "number")
})

test("ScenarioExecutor executes a single change set", () => {
  const result = ScenarioExecutor.create().execute({
    snapshot,
    scenario,
    changeSets: [
      createDepartment("change-1", 1, "department-1", "Financeiro"),
    ],
  })

  assert.equal(result.issues.length, 0)
  assert.equal(result.organization.departments.length, 1)
  assert.equal(
    result.organization.departments[0]?.id,
    "department-1"
  )
  assert.equal(result.executedChangeSets.length, 1)
})

test("ScenarioExecutor executes multiple change sets", () => {
  const result = ScenarioExecutor.create().execute({
    snapshot,
    scenario,
    changeSets: [
      createDepartment("change-1", 1, "department-1", "Financeiro"),
      createDepartment("change-2", 2, "department-2", "Operações"),
    ],
  })

  assert.equal(result.issues.length, 0)
  assert.equal(result.organization.departments.length, 2)
  assert.equal(result.executedChangeSets.length, 2)
})

test("ScenarioExecutor orders change sets by version and id before executing", () => {
  const result = ScenarioExecutor.create().execute({
    snapshot,
    scenario,
    changeSets: [
      createDepartment("change-b", 2, "department-2", "Operações"),
      createDepartment("change-a", 1, "department-1", "Financeiro"),
    ],
  })

  assert.deepEqual(
    result.executedChangeSets.map(
      (current) => current.id
    ),
    ["change-a", "change-b"]
  )
  assert.deepEqual(
    result.organization.departments.map(
      (department) => department.id
    ),
    ["department-1", "department-2"]
  )
})

test("ScenarioExecutor surfaces a projection failure as issues", () => {
  const result = ScenarioExecutor.create().execute({
    snapshot,
    scenario,
    changeSets: [
      // Payload inválido: department.create sem nome.
      changeSet("change-1", 1, "department.create", {
        departmentId: "department-1",
      }),
    ],
  })

  assert.equal(result.issues.length > 0, true)
  assert.equal(
    result.issues[0]?.code,
    "department.change_set.invalid_payload"
  )
  assert.deepEqual(result.organization.departments, [])
  // O change set que falhou não é reportado como executado.
  assert.equal(result.executedChangeSets.length, 0)
})

test("ScenarioExecutor reports only change sets completed before an intermediate failure", () => {
  const result = ScenarioExecutor.create().execute({
    snapshot,
    scenario,
    changeSets: [
      createDepartment("change-1", 1, "department-1", "Financeiro"),
      changeSet("change-2", 2, "department.create", {
        departmentId: "department-2",
      }),
      createDepartment("change-3", 3, "department-3", "Operações"),
    ],
  })

  assert.deepEqual(
    result.executedChangeSets.map((current) => current.id),
    ["change-1"]
  )
  assert.deepEqual(
    result.organization.departments.map((department) => department.id),
    ["department-1"]
  )
  assert.equal(
    result.issues[0]?.changeSetId,
    "change-2"
  )
})

test("ScenarioExecutor reports metrics from the projection", () => {
  const result = ScenarioExecutor.create().execute({
    snapshot,
    scenario,
    changeSets: [
      createDepartment("change-1", 1, "department-1", "Financeiro"),
    ],
  })

  assert.equal(result.metrics.departments, 1)
  assert.equal(result.metrics.headcount, 0)
  assert.equal(result.metrics, result.organization.metrics)
})

test("ScenarioExecutor is deterministic for equivalent inputs and clock", () => {
  const input = {
    snapshot,
    scenario,
    changeSets: [
      createDepartment("change-1", 1, "department-1", "Financeiro"),
    ],
  }

  const first = ScenarioExecutor.create(
    sequentialClock([1000, 1005])
  ).execute(input)
  const second = ScenarioExecutor.create(
    sequentialClock([1000, 1005])
  ).execute(input)

  assert.deepEqual(first, second)
  assert.deepEqual(
    first.generatedAt,
    new Date(1000)
  )
  assert.equal(first.duration, 5)
})

test("ScenarioExecutor produces an immutable result", () => {
  const nestedPayload = {
    departmentId: "department-1",
    name: "Financeiro",
    metadata: {
      tags: ["critical"],
    },
  }
  const inputChangeSet = changeSet(
    "change-1",
    1,
    "department.create",
    nestedPayload
  )
  const result = ScenarioExecutor.create().execute({
    snapshot,
    scenario,
    changeSets: [inputChangeSet],
  })

  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.executedChangeSets), true)
  assert.equal(Object.isFrozen(result.organization), true)
  assert.equal(Object.isFrozen(result.organization.departments), true)
  assert.equal(Object.isFrozen(result.metrics), true)
  assert.equal(Object.isFrozen(result.issues), true)
  assert.equal(Object.isFrozen(result.warnings), true)
  assert.equal(Object.isFrozen(result.executedChangeSets[0]), true)
  assert.equal(Object.isFrozen(result.executedChangeSets[0]?.payload), true)
  assert.equal(
    Object.isFrozen(
      result.executedChangeSets[0]?.payload.metadata
    ),
    true
  )
  assert.throws(() => {
    ;(result.executedChangeSets as ChangeSet[]).push(
      createDepartment("change-x", 9, "department-x", "X")
    )
  }, TypeError)
  assert.throws(() => {
    ;(result.executedChangeSets[0] as { version: number }).version = 99
  }, TypeError)
  assert.throws(() => {
    const metadata = result.executedChangeSets[0]?.payload.metadata as {
      tags: string[]
    }
    metadata.tags.push("mutated")
  }, TypeError)

  assert.equal(inputChangeSet.version, 1)
  assert.deepEqual(inputChangeSet.payload, nestedPayload)
  assert.equal(snapshot.publishedAt.getTime(), Date.parse("2026-01-01T00:00:00.000Z"))
})
