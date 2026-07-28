import assert from "node:assert/strict"
import test from "node:test"

import type { PlanningChangeSet } from "../../change-sets"
import { PlanningScenario } from "../../domain/planning-scenario"
import { PublishedSnapshot } from "../../domain/published-snapshot"
import {
  createEmptyProjectedOrganization,
  freezeProjectedOrganization,
} from "../../projection/contracts"
import { ProjectionResult } from "../../projection/result"
import type { OrganizationSnapshot } from "../../snapshot"
import { ORGANIZATION_SNAPSHOT_SCHEMA_VERSION } from "../../snapshot"
import {
  ScenarioComparisonApplicationService,
  ScenarioComparisonProjectionError,
} from "../services"
import type {
  ProjectScenarioExecution,
  ProjectScenarioService,
} from "../services/project-scenario-service"

const companyId = "company-1"
const workspaceId = "workspace-1"
const snapshotId = "snapshot-1"
const scenarioId = "scenario-1"

const scenario = PlanningScenario.restore({
  id: scenarioId,
  companyId,
  workspaceId,
  baseSnapshotId: snapshotId,
  name: "Cenário",
  description: null,
  status: "draft",
  version: 1,
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
})

const snapshot = PublishedSnapshot.restore({
  id: snapshotId,
  companyId,
  workspaceId,
  sourceScenarioId: null,
  version: 1,
  publishedAt: new Date("2026-07-01T00:00:00.000Z"),
})

const organizationSnapshot: OrganizationSnapshot = Object.freeze({
  schemaVersion: ORGANIZATION_SNAPSHOT_SCHEMA_VERSION,
  generatedAt: "2026-07-01T00:00:00.000Z",
  departments: Object.freeze([]),
  teams: Object.freeze([]),
  positions: Object.freeze([]),
  employees: Object.freeze([]),
})

const organization = freezeProjectedOrganization({
  ...createEmptyProjectedOrganization(),
  departments: [
    Object.freeze({
      id: "department-1",
      name: "Produto",
      code: "PROD",
      description: null,
      parentDepartmentId: null,
      status: "active" as const,
    }),
  ],
  metrics: Object.freeze({
    headcount: 0,
    vacancies: 0,
    salaryMass: 0,
    departments: 1,
    positions: 0,
  }),
})

const execution = (projection: ProjectionResult): ProjectScenarioExecution =>
  Object.freeze({
    scenario,
    snapshot,
    organizationSnapshot,
    changeSets: Object.freeze([]) as readonly PlanningChangeSet[],
    projection,
  })

class ProjectScenarioServiceFake {
  readonly calls: Array<{ companyId: string; scenarioId: string }> = []

  constructor(private readonly value: ProjectScenarioExecution) {}

  async executeWithContext(input: { companyId: string; scenarioId: string }) {
    this.calls.push(input)
    return this.value
  }
}

function asProjectScenarioService(fake: ProjectScenarioServiceFake) {
  return fake as unknown as ProjectScenarioService
}

test("ScenarioComparisonApplicationService projects through ProjectScenarioService and presents the comparison", async () => {
  const projectScenario = new ProjectScenarioServiceFake(
    execution(ProjectionResult.create({ organization }))
  )
  const service = new ScenarioComparisonApplicationService(
    asProjectScenarioService(projectScenario)
  )

  const viewModel = await service.execute({ companyId, scenarioId })

  assert.deepEqual(projectScenario.calls, [{ companyId, scenarioId }])
  assert.equal(viewModel.departments.created[0]?.entity.name, "Produto")
  assert.equal(viewModel.summary.departments.created, 1)
  assert.equal(viewModel.summary.totalChanges, 1)
  assert.doesNotThrow(() => JSON.stringify(viewModel))
  assert.equal("salaryMass" in viewModel.summary.metrics, false)
})

test("ScenarioComparisonApplicationService rejects an invalid projection before comparison and presentation", async () => {
  let comparisonCalls = 0
  let presenterCalls = 0
  const invalidProjection = ProjectionResult.create({
    organization,
    errors: [
      Object.freeze({
        code: "projection.invalid",
        message: "Projeção inválida.",
        changeSetId: "change-set-1",
      }),
    ],
  })
  const service = new ScenarioComparisonApplicationService(
    asProjectScenarioService(
      new ProjectScenarioServiceFake(execution(invalidProjection))
    ),
    {
      compare: () => {
        comparisonCalls += 1
        throw new Error("Comparison não deveria ser chamado.")
      },
      present: () => {
        presenterCalls += 1
        throw new Error("Presenter não deveria ser chamado.")
      },
    }
  )

  await assert.rejects(
    service.execute({ companyId, scenarioId }),
    (error: unknown) => {
      assert.equal(error instanceof ScenarioComparisonProjectionError, true)

      if (!(error instanceof ScenarioComparisonProjectionError)) return false

      assert.equal(error.code, "scenario_comparison.projection_failed")
      assert.deepEqual(error.issues, invalidProjection.errors)
      return true
    }
  )

  assert.equal(comparisonCalls, 0)
  assert.equal(presenterCalls, 0)
})
