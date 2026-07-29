import assert from "node:assert/strict"
import test from "node:test"

import type { ChangeSet } from "../types/planning-contracts"
import {
  createPlanningChangeSetRepositoryAdapter,
  type PlanningChangeSetDatabase,
  type PlanningChangeSetDatabaseResult,
  type PlanningChangeSetSelectQuery,
} from "./planning-change-set-repository-adapter"
import { mapPlanningChangeSetRow } from "./planning-change-set-record"

const companyId = "00000000-0000-0000-0000-000000000001"
const scenarioId = "00000000-0000-0000-0000-000000000002"

test("persists a Change Set without changing its payload", async () => {
  const calls = createDatabaseMock([])
  const repository = createPlanningChangeSetRepositoryAdapter(
    calls.database
  )
  const changeSet = createChangeSet({
    id: "00000000-0000-0000-0000-000000000003",
    changeType: "department.create",
    payload: { department: { name: "Operations" } },
  })

  await repository.create(changeSet)

  assert.deepEqual(calls.inserted, [{
    id: changeSet.id,
    company_id: companyId,
    scenario_id: scenarioId,
    change_type: "department.create",
    payload: changeSet.payload,
    version: 1,
  }])
})

test("filters publishable Change Sets server-side and orders by version and id", async () => {
  const rows = [
    createRow("00000000-0000-0000-0000-000000000004", 1, "team.create"),
    createRow("00000000-0000-0000-0000-000000000005", 2, "position.create"),
    createRow("00000000-0000-0000-0000-000000000003", 1, "department.create"),
  ]
  const calls = createDatabaseMock(rows)
  const repository = createPlanningChangeSetRepositoryAdapter(
    calls.database
  )

  const result = await repository.listPublishableByScenario({
    companyId,
    scenarioId,
  })

  assert.deepEqual(calls.filters, [
    ["company_id", companyId],
    ["scenario_id", scenarioId],
    ["active", true],
    ["archived_at", null],
    ["superseded_by", null],
  ])
  assert.deepEqual(calls.orders, ["version", "id"])
  assert.deepEqual(result.map(({ id }) => id), [
    "00000000-0000-0000-0000-000000000003",
    "00000000-0000-0000-0000-000000000004",
    "00000000-0000-0000-0000-000000000005",
  ])
  assert.deepEqual(result.map(({ changeType }) => changeType), [
    "department.create",
    "team.create",
    "position.create",
  ])
})

test("excludes inactive, archived, superseded, and other-company Change Sets", async () => {
  const publishable = createRow(
    "00000000-0000-0000-0000-000000000003",
    1,
    "department.create"
  )
  const calls = createDatabaseMock([
    publishable,
    { ...createRow("inactive", 2, "team.create"), active: false },
    {
      ...createRow("archived", 3, "position.create"),
      active: false,
      archived_at: "2026-07-29T00:00:00.000Z",
    },
    {
      ...createRow("superseded", 4, "department.update"),
      active: false,
      superseded_by: "replacement",
    },
    {
      ...createRow("other-company", 5, "team.update"),
      company_id: "00000000-0000-0000-0000-000000000099",
    },
    {
      ...createRow("other-scenario", 6, "position.update"),
      scenario_id: "00000000-0000-0000-0000-000000000098",
    },
  ])
  const repository = createPlanningChangeSetRepositoryAdapter(
    calls.database
  )

  const result = await repository.listPublishableByScenario({
    companyId,
    scenarioId,
  })

  assert.deepEqual(result.map(({ id }) => id), [publishable.id])
})

test("returns an empty immutable list when the scenario has no Change Sets", async () => {
  const calls = createDatabaseMock([])
  const repository = createPlanningChangeSetRepositoryAdapter(
    calls.database
  )

  const result = await repository.listPublishableByScenario({
    companyId,
    scenarioId,
  })

  assert.deepEqual(result, [])
  assert.equal(Object.isFrozen(result), true)
})

test("rejects invalid persisted data", () => {
  assert.throws(
    () => mapPlanningChangeSetRow({
      ...createRow("change-invalid", 1, "department.create"),
      payload: ["not", "an", "object"],
    }),
    /PLANNING_CHANGE_SET_INVALID_DATA/
  )
})

test("maps payloads deeply without sharing mutable references", () => {
  const payload = {
    department: { name: "Operations", tags: ["core"] },
  }
  const result = mapPlanningChangeSetRow({
    ...createRow("change-payload", 1, "department.create"),
    payload,
  })

  payload.department.name = "Changed"
  payload.department.tags.push("mutated")

  assert.deepEqual(result.payload, {
    department: { name: "Operations", tags: ["core"] },
  })
  assert.equal(Object.isFrozen(result.payload), true)
  assert.equal(Object.isFrozen(result.payload.department), true)
})

function createChangeSet(
  overrides: Partial<ChangeSet> = {}
): ChangeSet {
  return Object.freeze({
    id: "00000000-0000-0000-0000-000000000003",
    companyId,
    scenarioId,
    changeType: "department.create",
    payload: Object.freeze({}),
    version: 1,
    ...overrides,
  })
}

function createRow(id: string, version: number, changeType: string) {
  return {
    id,
    company_id: companyId,
    scenario_id: scenarioId,
    change_type: changeType,
    payload: { value: changeType },
    version,
    active: true,
    archived_at: null,
    superseded_by: null,
  }
}

function createDatabaseMock(rows: readonly unknown[]) {
  const inserted: Readonly<Record<string, unknown>>[] = []
  const filters: [string, string | boolean | null][] = []
  const orders: string[] = []
  const activeFilters: [string, string | boolean | null][] = []
  const activeOrders: string[] = []

  const query: PlanningChangeSetSelectQuery = {
    eq(column, value) {
      filters.push([column, value])
      activeFilters.push([column, value])
      return query
    },
    is(column, value) {
      filters.push([column, value])
      activeFilters.push([column, value])
      return query
    },
    order(column) {
      orders.push(column)
      activeOrders.push(column)
      return query
    },
    then(onfulfilled, onrejected) {
      const data = rows
        .filter((row) => activeFilters.every(([column, value]) =>
          isRecord(row) && row[column] === value
        ))
        .sort((left, right) => compareRows(left, right, activeOrders))
      const result: PlanningChangeSetDatabaseResult = {
        data,
        error: null,
      }
      return Promise.resolve(result).then(onfulfilled, onrejected)
    },
  }

  const database: PlanningChangeSetDatabase = {
    from(table) {
      assert.equal(table, "organization_planning_change_sets")
      return {
        insert(value) {
          inserted.push(value)
          return Promise.resolve({ data: null, error: null })
        },
        select() {
          return query
        },
      }
    },
  }

  return { database, filters, inserted, orders }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
}

function compareRows(
  left: unknown,
  right: unknown,
  columns: readonly string[]
) {
  if (!isRecord(left) || !isRecord(right)) return 0

  for (const column of columns) {
    const comparison = String(left[column]).localeCompare(
      String(right[column]),
      undefined,
      { numeric: true }
    )
    if (comparison !== 0) return comparison
  }

  return 0
}
