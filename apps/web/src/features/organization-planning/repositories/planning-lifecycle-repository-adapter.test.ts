import assert from "node:assert/strict"
import test from "node:test"

import { createPlanningLifecycleRepositoryAdapter } from "./planning-lifecycle-repository-adapter"

test("uses expected_version, private rejection reason and returns durable RPC readback", async () => {
  const calls: unknown[] = []
  const readback = { scenarioId: "scenario-1", status: "rejected", version: 3, updatedAt: "2026-09-22T12:00:00Z", auditId: "audit-1", idempotent: false }
  const repository = createPlanningLifecycleRepositoryAdapter({ async rpc(name, parameters) {
    calls.push({ name, parameters })
    return { data: readback, error: null }
  } })
  assert.deepEqual(await repository.transition({ scenarioId: "scenario-1", transition: "reject", expectedVersion: 2, idempotencyKey: "key-1", reason: "Capacity assumptions changed" }), readback)
  assert.deepEqual(calls, [{ name: "transition_planning_scenario_v1", parameters: {
    p_scenario_id: "scenario-1", p_transition: "reject", p_expected_version: 2,
    p_idempotency_key: "key-1", p_reason: "Capacity assumptions changed",
  } }])
})

test("reads append-only lifecycle history through the trusted boundary", async () => {
  const repository = createPlanningLifecycleRepositoryAdapter({ async rpc(name, parameters) {
    assert.equal(name, "get_planning_scenario_lifecycle_v1")
    assert.deepEqual(parameters, { p_scenario_id: "scenario-1" })
    return { data: [{ audit_id: "audit-1", event_type: "planning.scenario.submitted" }], error: null }
  } })
  assert.equal((await repository.history("scenario-1")).length, 1)
})
