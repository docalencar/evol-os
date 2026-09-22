import assert from "node:assert/strict"
import test from "node:test"

import { createEmptyProjectedOrganization } from "../projection"
import { createPlanningPublicationRepositoryAdapter } from "./planning-publication-repository-adapter"

const companyId = "company-1"
const scenarioId = "scenario-1"
const snapshotId = "snapshot-2"
const organization = createEmptyProjectedOrganization()
const scenarioRow = {
  id: scenarioId, company_id: companyId, workspace_id: "workspace-1", base_snapshot_id: "snapshot-1",
  parent_scenario_id: null, branch_depth: 0, branch_path: scenarioId, name: "Cenário", description: null,
  status: "published" as const, version: 4, created_at: "2026-07-28T12:00:00.000Z", updated_at: "2026-07-29T12:00:00.000Z",
}
const snapshotRow = {
  id: snapshotId, company_id: companyId, workspace_id: "workspace-1", source_scenario_id: scenarioId,
  version: 2, published_at: "2026-07-29T12:00:00.000Z", kind: "projection", organization,
}

test("publishes only through v1 and performs canonical durable readback", async () => {
  const calls: { name: string; parameters: Readonly<Record<string, unknown>> }[] = []
  const repository = createPlanningPublicationRepositoryAdapter({ async rpc(name, parameters) {
    calls.push({ name, parameters })
    if (name === "publish_planning_scenario_v1") return { data: { snapshotId }, error: null }
    if (name === "get_planning_scenarios_v1") return { data: [scenarioRow], error: null }
    return { data: [snapshotRow], error: null }
  } })
  const result = await repository.publish({ companyId, scenarioId, expectedVersion: 3, snapshotId, publishedAt: new Date(), organization, changeSets: [] })
  assert.deepEqual(calls.map(({ name }) => name), ["publish_planning_scenario_v1", "get_planning_scenarios_v1", "get_planning_snapshots_v1"])
  assert.deepEqual(calls[0]?.parameters, { p_scenario_id: scenarioId, p_expected_version: 3, p_snapshot_id: snapshotId, p_organization: organization, p_change_sets: [] })
  assert.equal(result.scenario.status, "published")
  assert.equal(result.snapshot.id, snapshotId)
})

test("does not report success when canonical readback is absent", async () => {
  const repository = createPlanningPublicationRepositoryAdapter({ async rpc(name) {
    return name === "publish_planning_scenario_v1" ? { data: { snapshotId }, error: null } : { data: [], error: null }
  } })
  await assert.rejects(repository.publish({ companyId, scenarioId, expectedVersion: 3, snapshotId, publishedAt: new Date(), organization, changeSets: [] }), /PLANNING_PUBLICATION_READBACK_NOT_FOUND/)
})

test("propagates a trusted RPC conflict before readback", async () => {
  const repository = createPlanningPublicationRepositoryAdapter({ async rpc() { return { data: null, error: { message: "PLANNING_VERSION_CONFLICT" } } } })
  await assert.rejects(repository.publish({ companyId, scenarioId, expectedVersion: 3, snapshotId, publishedAt: new Date(), organization, changeSets: [] }), /PLANNING_VERSION_CONFLICT/)
})
