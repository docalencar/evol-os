import assert from "node:assert/strict"
import test from "node:test"

import { createWorkspace } from "../services/create-workspace"
import { createEmptyProjectedOrganization } from "../projection"
import {
  createPlanningBaselineRepositoryAdapter,
  type PlanningBaselineDatabase,
} from "./planning-baseline-repository-adapter"

test("checks whether the Company's Workspace already has a Baseline", async () => {
  const calls: [string, string][] = []
  const database = databaseMock(calls, { id: "snapshot-1" })
  const repository = createPlanningBaselineRepositoryAdapter(database)

  assert.equal(
    await repository.existsBaselineByCompany("company-1"),
    true
  )
  assert.deepEqual(calls, [
    ["company_id", "company-1"],
    ["kind", "baseline"],
  ])
})

test("persists Workspace and Baseline atomically through the RPC", async () => {
  const rpcCalls: {
    name: string
    parameters: Readonly<Record<string, unknown>>
  }[] = []
  const database = databaseMock([], null, rpcCalls)
  const repository = createPlanningBaselineRepositoryAdapter(database)
  const createdAt = new Date("2026-07-30T12:00:00.000Z")
  const { workspace, initialSnapshot } = createWorkspace({
    id: "00000000-0000-4000-8000-000000000002",
    companyId: "00000000-0000-4000-8000-000000000001",
    initialSnapshotId: "00000000-0000-4000-8000-000000000003",
    allocatedInitialSnapshotVersion: 1,
    createdAt,
  })
  const organization = createEmptyProjectedOrganization()

  await repository.create({
    workspace,
    snapshot: initialSnapshot,
    organization,
  })

  assert.deepEqual(rpcCalls, [{
    name: "bootstrap_planning_workspace",
    parameters: {
      p_company_id: "00000000-0000-4000-8000-000000000001",
      p_workspace_id: "00000000-0000-4000-8000-000000000002",
      p_snapshot_id: "00000000-0000-4000-8000-000000000003",
      p_created_at: createdAt.toISOString(),
      p_organization: organization,
    },
  }])
  assert.equal(initialSnapshot.kind, "baseline")
  assert.equal(initialSnapshot.version, 1)
})

function databaseMock(
  calls: [string, string][] = [],
  existing: unknown = null,
  rpcCalls: {
    name: string
    parameters: Readonly<Record<string, unknown>>
  }[] = []
): PlanningBaselineDatabase {
  const result = { data: existing, error: null }
  const query = {
    eq(column: string, value: string) {
      calls.push([column, value])
      return query
    },
    maybeSingle() {
      return Promise.resolve(result)
    },
    then<TResult1 = typeof result, TResult2 = never>(
      onfulfilled?: ((value: typeof result) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return Promise.resolve(result).then(onfulfilled, onrejected)
    },
  }

  return {
    from(table) {
      assert.equal(table, "organization_planning_snapshots")
      return { select: () => query }
    },
    async rpc(name, parameters) {
      rpcCalls.push({ name, parameters })
      return { data: null, error: null }
    },
  }
}
