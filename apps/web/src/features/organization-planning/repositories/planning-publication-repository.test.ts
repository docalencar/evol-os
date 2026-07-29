import assert from "node:assert/strict"
import test from "node:test"

import {
  createEmptyProjectedOrganization,
  freezeProjectedOrganization,
} from "../projection"
import {
  createPlanningPublicationRepositoryAdapter,
  type PlanningPublicationDatabase,
} from "./planning-publication-repository-adapter"

const organization = freezeProjectedOrganization({
  ...createEmptyProjectedOrganization(),
  departments: [{
    id: "department-1",
    name: "Financeiro",
    code: null,
    description: null,
    parentDepartmentId: null,
    status: "active",
  }],
  metrics: {
    ...createEmptyProjectedOrganization().metrics,
    departments: 1,
  },
})

test("sends the projected organization to the transactional RPC", async () => {
  const calls: { name: string; parameters: Readonly<Record<string, unknown>> }[] = []
  const database: PlanningPublicationDatabase = {
    async rpc(name, parameters) {
      calls.push({ name, parameters })
      return { data: [publicationRow(organization)], error: null }
    },
  }
  const repository = createPlanningPublicationRepositoryAdapter(database)
  const publishedAt = new Date("2026-07-29T12:00:00.000Z")
  const changeSets = [{
    id: "change-1",
    companyId: "company-1",
    scenarioId: "scenario-1",
    changeType: "department.update",
    payload: { departmentId: "department-1", name: "Financeiro" },
    version: 1,
  }]

  const result = await repository.publish({
    companyId: "company-1",
    scenarioId: "scenario-1",
    expectedVersion: 3,
    snapshotId: "snapshot-2",
    publishedAt,
    organization,
    changeSets,
  })

  assert.equal(calls[0]?.name, "publish_planning_scenario")
  assert.deepEqual(calls[0]?.parameters, {
    p_company_id: "company-1",
    p_scenario_id: "scenario-1",
    p_expected_version: 3,
    p_snapshot_id: "snapshot-2",
    p_published_at: publishedAt.toISOString(),
    p_organization: organization,
    p_change_sets: [{
      id: "change-1",
      changeType: "department.update",
      payload: { departmentId: "department-1", name: "Financeiro" },
      version: 1,
    }],
  })
  assert.deepEqual(result.organization, organization)
  assert.equal(result.snapshot.id, "snapshot-2")
  assert.equal(result.snapshot.kind, "projection")
})

test("rejects an invalid organization returned by the RPC", async () => {
  const database: PlanningPublicationDatabase = {
    async rpc() {
      return {
        data: [publicationRow({ departments: [] })],
        error: null,
      }
    },
  }
  const repository = createPlanningPublicationRepositoryAdapter(database)

  await assert.rejects(
    () => repository.publish({
      companyId: "company-1",
      scenarioId: "scenario-1",
      expectedVersion: 3,
      snapshotId: "snapshot-2",
      publishedAt: new Date("2026-07-29T12:00:00.000Z"),
      organization,
      changeSets: [],
    }),
    /PLANNING_PROJECTED_ORGANIZATION_INVALID_DATA/
  )
})

test("propagates an RPC failure without producing a publication result", async () => {
  const database: PlanningPublicationDatabase = {
    async rpc() {
      return {
        data: null,
        error: { message: "PLANNING_VERSION_CONFLICT" },
      }
    },
  }
  const repository = createPlanningPublicationRepositoryAdapter(database)

  await assert.rejects(
    () => repository.publish({
      companyId: "company-1",
      scenarioId: "scenario-1",
      expectedVersion: 3,
      snapshotId: "snapshot-2",
      publishedAt: new Date("2026-07-29T12:00:00.000Z"),
      organization,
      changeSets: [],
    }),
    /PLANNING_VERSION_CONFLICT/
  )
})

function publicationRow(snapshotOrganization: unknown) {
  return {
    scenario_id: "scenario-1",
    scenario_company_id: "company-1",
    scenario_workspace_id: "workspace-1",
    scenario_base_snapshot_id: "snapshot-1",
    scenario_name: "Cenário",
    scenario_description: null,
    scenario_status: "published",
    scenario_version: 4,
    scenario_created_at: "2026-07-28T12:00:00.000Z",
    scenario_updated_at: "2026-07-29T12:00:00.000Z",
    snapshot_id: "snapshot-2",
    snapshot_company_id: "company-1",
    snapshot_workspace_id: "workspace-1",
    snapshot_source_scenario_id: "scenario-1",
    snapshot_version: 2,
    snapshot_published_at: "2026-07-29T12:00:00.000Z",
    snapshot_organization: snapshotOrganization,
  }
}
