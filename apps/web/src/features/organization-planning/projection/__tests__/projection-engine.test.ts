import assert from "node:assert/strict"
import test from "node:test"
import type { ChangeSetExecutor } from "../executors"
import { ProjectionContext } from "../context"
import { ProjectionEngine } from "../engine"
import { DepartmentExecutor } from "../executors"
import { ProjectionPipeline } from "../pipeline"
import { ProjectionResult } from "../result"
import { ProjectionContractValidator } from "../validators"
import type {
  ChangeSet,
  PlanningScenarioContract,
  PublishedSnapshotContract,
} from "../../types/planning-contracts"

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

function changeSet(id: string, version: number, changeType = "department.create"): ChangeSet {
  return Object.freeze({
    id,
    companyId: "company-1",
    scenarioId: "scenario-1",
    changeType,
    payload: Object.freeze({}),
    version,
  })
}

test("ProjectionContext starts with an immutable empty organization", () => {
  const source = [changeSet("change-1", 1)]
  const context = ProjectionContext.create(snapshot, scenario, source)
  source.push(changeSet("change-2", 2))

  assert.equal(context.changeSets.length, 1)
  assert.deepEqual(context.organization.departments, [])
  assert.equal(Object.isFrozen(context.organization), true)
  assert.equal(Object.isFrozen(context.organization.departments), true)
  assert.throws(() => {
    ;(context.organization.departments as { id: string }[]).push({ id: "department-1" })
  }, TypeError)
})

test("Pipeline discovers the executor and records its execution", () => {
  const context = ProjectionContext.create(snapshot, scenario, [changeSet("change-1", 1)])
  const projected = new ProjectionPipeline([new DepartmentExecutor()]).execute(context)

  assert.deepEqual(projected.events, [{
    type: "change-set.executed",
    changeSetId: "change-1",
    executor: "DepartmentExecutor",
  }])
  assert.deepEqual(projected.warnings, [])
})

test("Pipeline reports an unsupported change set without mutating the state", () => {
  const context = ProjectionContext.create(snapshot, scenario, [
    changeSet("change-1", 1, "unknown.change"),
  ])
  const projected = new ProjectionPipeline([]).execute(context)

  assert.equal(projected.organization, context.organization)
  assert.equal(projected.warnings[0]?.code, "unhandled_change_set")
  assert.equal(projected.events[0]?.type, "change-set.unhandled")
})

test("ProjectionEngine executes change sets by version and id", () => {
  const order: string[] = []
  const executor: ChangeSetExecutor = {
    name: "RecordingExecutor",
    canExecute: () => true,
    execute: (context, currentChangeSet) => {
      order.push(currentChangeSet.id)
      return context
    },
  }
  const engine = ProjectionEngine.create([executor])

  engine.project({
    snapshot,
    scenario,
    changeSets: [changeSet("change-c", 2), changeSet("change-b", 1), changeSet("change-a", 1)],
  })

  assert.deepEqual(order, ["change-a", "change-b", "change-c"])
})

test("ProjectionEngine is deterministic for equivalent inputs", () => {
  const engine = ProjectionEngine.create()
  const input = {
    snapshot,
    scenario,
    changeSets: [changeSet("change-b", 2), changeSet("change-a", 1)],
  }

  assert.deepEqual(engine.project(input), engine.project(input))
})

test("ProjectionEngine recalculates the structural metric scaffold", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [],
  })

  assert.deepEqual(result.metrics, {
    headcount: 0,
    vacancies: 0,
    salaryMass: 0,
    departments: 0,
    positions: 0,
  })
  assert.equal(result.metrics, result.organization.metrics)
})

test("ProjectionEngine freezes state produced by an executor", () => {
  const executor: ChangeSetExecutor = {
    name: "MutableOutputExecutor",
    canExecute: () => true,
    execute: (context) => context.withOrganization({
      ...context.organization,
      departments: [{ id: "department-1" }],
    }),
  }
  const result = ProjectionEngine.create([executor]).project({
    snapshot,
    scenario,
    changeSets: [changeSet("change-1", 1)],
  })

  assert.equal(result.metrics.departments, 1)
  assert.equal(Object.isFrozen(result.organization.departments), true)
  assert.equal(Object.isFrozen(result.organization.departments[0]), true)
})

test("ProjectionContractValidator detects snapshot, workspace and change-set scope errors", () => {
  const invalidScenario = Object.freeze({
    ...scenario,
    companyId: "company-2",
    workspaceId: "workspace-2",
    baseSnapshotId: "snapshot-2",
  })
  const context = ProjectionContext.create(snapshot, invalidScenario, [changeSet("change-1", 1)])
  const errors = new ProjectionContractValidator().validate(context)

  assert.deepEqual(errors.map((error) => error.code), [
    "company_mismatch",
    "workspace_mismatch",
    "base_snapshot_mismatch",
    "change_set_scope_mismatch",
  ])
})

test("ProjectionResult freezes its result collections and exposes validity", () => {
  const context = ProjectionContext.create(snapshot, scenario, [])
  const result = ProjectionResult.create({ organization: context.organization })

  assert.equal(result.isValid, true)
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.warnings), true)
  assert.equal(Object.isFrozen(result.errors), true)
})
