import assert from "node:assert/strict"
import test from "node:test"

import { createPlanningChangeSetRepositoryAdapter } from "./planning-change-set-repository-adapter"

test("reads canonical change sets exclusively through the trusted RPC", async () => {
  const calls: unknown[] = []
  const repository = createPlanningChangeSetRepositoryAdapter({ async rpc(name, parameters) {
    calls.push({ name, parameters })
    return { data: [{ id: "change-1", company_id: "company-1", scenario_id: "scenario-1", change_type: "rename", payload: { name: "North" }, version: 1 }], error: null }
  } })
  const result = await repository.listPublishableByScenario({ companyId: "company-1", scenarioId: "scenario-1" })
  assert.equal(result[0]?.id, "change-1")
  assert.deepEqual(calls, [{ name: "get_planning_change_sets_v1", parameters: { p_scenario_id: "scenario-1" } }])
})

/**
 * Re-anchored, not deleted. The previous assertion proved that the retired
 * direct-table `create()` had no compatibility path left, by rejecting with
 * `PLANNING_CHANGE_SET_CREATE_RETIRED`. PLN-P5B replaces that stub with real
 * trusted mutations, so the stub no longer exists and the old assertion would
 * now be testing a method the adapter does not have.
 *
 * The property it defended is unchanged and is what is asserted here: a change
 * set is never mutated through the table, only through the `0138` RPCs.
 */
test("mutates change sets exclusively through the trusted 0138 RPCs", async () => {
  const calls: Array<{ name: string; parameters: Readonly<Record<string, unknown>> }> = []
  const repository = createPlanningChangeSetRepositoryAdapter({
    async rpc(name, parameters) {
      calls.push({ name, parameters })
      return { data: {}, error: null }
    },
  })

  await repository.createTrusted({
    scenarioId: "scenario-1",
    expectedVersion: 3,
    changeSetId: "change-1",
    changeType: "department.create",
    payload: { departmentId: "department-1" },
  })
  await repository.replaceTrusted({
    scenarioId: "scenario-1",
    expectedVersion: 4,
    currentChangeSetId: "change-1",
    changeSetId: "change-2",
    changeType: "department.create",
    payload: { departmentId: "department-1" },
  })
  await repository.removeTrusted({
    scenarioId: "scenario-1",
    expectedVersion: 5,
    changeSetId: "change-2",
  })
  await repository.reorderTrusted({
    scenarioId: "scenario-1",
    expectedVersion: 6,
    orderedChangeSetIds: ["change-3", "change-4"],
  })

  assert.deepEqual(
    calls.map((call) => call.name),
    [
      "create_planning_change_set_v1",
      "replace_planning_change_set_v1",
      "remove_planning_change_set_v1",
      "reorder_planning_change_sets_v1",
    ],
  )

  // Every mutation carries the caller's expected version: optimistic
  // concurrency is the boundary's, and the adapter must not drop it.
  for (const call of calls) {
    assert.equal(
      typeof call.parameters.p_expected_version,
      "number",
      `${call.name} must forward p_expected_version`,
    )
  }
})

test("surfaces the trusted boundary's failure instead of swallowing it", async () => {
  const repository = createPlanningChangeSetRepositoryAdapter({
    async rpc() {
      return { data: null, error: { message: "PLANNING_VERSION_CONFLICT" } }
    },
  })
  await assert.rejects(
    repository.removeTrusted({
      scenarioId: "scenario-1",
      expectedVersion: 1,
      changeSetId: "change-1",
    }),
    /PLANNING_VERSION_CONFLICT/,
  )
})
