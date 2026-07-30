import assert from "node:assert/strict"
import test from "node:test"

import { OrganizationPlanningWorkspace } from "../../domain/organization-planning-workspace"
import { PlanningScenario } from "../../domain/planning-scenario"
import { createEmptyProjectedOrganization, type ProjectionIssue, type ScenarioExecutionResult } from "../../projection"
import type { PlanningScenarioStatus } from "../../types/planning-contracts"
import { ScenarioPublicationValidationService } from "./scenario-publication-validation-service"

const companyId = "00000000-0000-4000-8000-000000000001"
const workspaceId = "00000000-0000-4000-8000-000000000002"
const scenarioId = "00000000-0000-4000-8000-000000000003"
const snapshotId = "00000000-0000-4000-8000-000000000004"

test("accepts an approved scenario with a consistent projection", async () => {
  const fixture = createFixture("approved")
  const result = await fixture.service.execute({ companyId, scenarioId, expectedVersion: fixture.scenario.version })
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
  assert.equal(fixture.executionCalls, 1)
  assertDeepFrozen(result)
})

for (const status of ["draft", "archived", "published"] as const) {
  test(`rejects a ${status} scenario before projection`, async () => {
    const fixture = createFixture(status)
    const result = await fixture.service.execute({ companyId, scenarioId, expectedVersion: fixture.scenario.version })
    assert.equal(result.valid, false)
    assert.equal(result.errors[0]?.code, `planning.scenario.status.${status}`)
    assert.equal(fixture.executionCalls, 0)
  })
}

test("rejects a missing Baseline", async () => {
  const fixture = createFixture("approved", { missingSnapshot: true })
  const result = await fixture.service.execute({ companyId, scenarioId, expectedVersion: fixture.scenario.version })
  assert.equal(result.valid, false)
  assert.equal(result.errors.some((current) => current.code === "planning.snapshot.not_found"), true)
  assert.equal(fixture.executionCalls, 0)
})

test("rejects blocking projection conflicts", async () => {
  const fixture = createFixture("approved", { errors: [{ code: "projection.conflict", message: "Conflito estrutural." }] })
  const result = await fixture.service.execute({ companyId, scenarioId, expectedVersion: fixture.scenario.version })
  assert.equal(result.valid, false)
  assert.equal(result.errors[0]?.code, "projection.conflict")
})

test("returns non-blocking warnings without invalidating publication", async () => {
  const fixture = createFixture("approved", { warnings: [{ code: "projection.warning", message: "Revisar impacto." }] })
  const result = await fixture.service.execute({ companyId, scenarioId, expectedVersion: fixture.scenario.version })
  assert.equal(result.valid, true)
  assert.equal(result.warnings[0]?.code, "projection.warning")
  assertDeepFrozen(result)
})

function createFixture(
  status: PlanningScenarioStatus,
  options: Readonly<{ missingSnapshot?: boolean; errors?: readonly ProjectionIssue[]; warnings?: readonly ProjectionIssue[] }> = {}
) {
  const scenario = scenarioWithStatus(status)
  const organization = createEmptyProjectedOrganization()
  let executionCalls = 0
  const service = new ScenarioPublicationValidationService({
    scenarios: {
      async findById() { return scenario },
      async create() {},
      async save() {},
    },
    workspaces: {
      async findById() { return OrganizationPlanningWorkspace.create({ id: workspaceId, companyId, createdAt: new Date("2026-07-01T00:00:00Z") }) },
      async create() {},
    },
    snapshots: {
      async findProjectionById() {
        return options.missingSnapshot ? null : {
          id: snapshotId, companyId, workspaceId, sourceScenarioId: null,
          version: 1, kind: "baseline" as const,
          publishedAt: new Date("2026-07-01T00:00:00Z"), organization,
        }
      },
    },
    changeSets: { async create() {}, async listPublishableByScenario() { return [] } },
    executor: {
      execute() {
        executionCalls += 1
        return executionResult(organization, options.errors ?? [], options.warnings ?? [])
      },
    },
  })
  return { service, scenario, get executionCalls() { return executionCalls } }
}

function scenarioWithStatus(status: PlanningScenarioStatus): PlanningScenario {
  const draft = PlanningScenario.create({ id: scenarioId, companyId, workspaceId, baseSnapshotId: snapshotId, name: "Cenário", createdAt: new Date("2026-07-01T00:00:00Z") })
  if (status === "draft") return draft
  if (status === "archived") return draft.archive(new Date("2026-07-02T00:00:00Z"))
  const approved = draft.submit(new Date("2026-07-02T00:00:00Z")).approve(new Date("2026-07-03T00:00:00Z"))
  return status === "published" ? approved.publish(new Date("2026-07-04T00:00:00Z")) : approved
}

function executionResult(
  organization: ReturnType<typeof createEmptyProjectedOrganization>,
  issues: readonly ProjectionIssue[], warnings: readonly ProjectionIssue[]
): ScenarioExecutionResult {
  return Object.freeze({ organization, metrics: organization.metrics, issues, warnings, executedChangeSets: [], generatedAt: new Date(0), duration: 0 })
}

function assertDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return
  assert.equal(Object.isFrozen(value), true)
  for (const nested of Object.values(value)) assertDeepFrozen(nested)
}
