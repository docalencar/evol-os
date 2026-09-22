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

test("does not preserve a direct-table mutation compatibility path", async () => {
  const repository = createPlanningChangeSetRepositoryAdapter({ async rpc() { return { data: [], error: null } } })
  await assert.rejects(repository.create({} as never), /PLANNING_CHANGE_SET_CREATE_RETIRED/)
})
