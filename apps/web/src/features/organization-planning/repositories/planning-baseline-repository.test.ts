import assert from "node:assert/strict"
import test from "node:test"

import { createEmptyProjectedOrganization } from "../projection"
import { createWorkspace } from "../services/create-workspace"
import { createPlanningBaselineRepositoryAdapter } from "./planning-baseline-repository-adapter"

const companyId = "00000000-0000-4000-8000-000000000001"
const workspaceId = "00000000-0000-4000-8000-000000000002"
const snapshotId = "00000000-0000-4000-8000-000000000003"
const createdAt = new Date("2026-07-30T12:00:00.000Z")

test("reads baseline existence through the trusted snapshots RPC", async () => {
  const calls: unknown[] = []
  const repository = createPlanningBaselineRepositoryAdapter({ async rpc(name, parameters) {
    calls.push({ name, parameters }); return { data: [{ kind: "baseline" }], error: null }
  } })
  assert.equal(await repository.existsBaselineByCompany(companyId), true)
  assert.deepEqual(calls, [{ name: "get_planning_snapshots_v1", parameters: { p_company_id: companyId } }])
})

test("bootstraps atomically and returns canonical persisted readback", async () => {
  const { workspace, initialSnapshot } = createWorkspace({ id: workspaceId, companyId, initialSnapshotId: snapshotId, allocatedInitialSnapshotVersion: 1, createdAt })
  const organization = createEmptyProjectedOrganization()
  const repository = createPlanningBaselineRepositoryAdapter({ async rpc(name, parameters) {
    assert.equal(name, "bootstrap_planning_workspace_v1")
    assert.deepEqual(parameters, { p_company_id: companyId, p_workspace_id: workspaceId, p_snapshot_id: snapshotId, p_organization: organization })
    return { data: {
      workspace: { id: workspaceId, company_id: companyId, version: 1, created_at: createdAt.toISOString(), updated_at: createdAt.toISOString() },
      snapshot: { id: snapshotId, company_id: companyId, workspace_id: workspaceId, source_scenario_id: null, version: 1, published_at: createdAt.toISOString(), kind: "baseline", organization },
    }, error: null }
  } })
  const result = await repository.create({ workspace, snapshot: initialSnapshot, organization })
  assert.equal(result.workspace.id, workspaceId)
  assert.equal(result.snapshot.id, snapshotId)
})
