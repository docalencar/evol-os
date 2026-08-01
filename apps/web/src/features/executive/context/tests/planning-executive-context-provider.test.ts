import assert from "node:assert/strict"
import test from "node:test"

import { OrganizationPlanningWorkspace } from "@/features/organization-planning/domain/organization-planning-workspace"
import { PlanningScenario } from "@/features/organization-planning/domain/planning-scenario"

import {
  PlanningExecutiveContextProvider,
  type PlanningScenarioSource,
  type PlanningWorkspaceSource,
} from "../providers"

const companyId = "company-1"

function createWorkspace(
  id: string,
): OrganizationPlanningWorkspace {
  return OrganizationPlanningWorkspace.create({
    id,
    companyId,
    createdAt: new Date("2026-08-01T09:00:00.000Z"),
  })
}

function createScenario(
  id: string,
  workspaceId: string,
): PlanningScenario {
  return PlanningScenario.create({
    id,
    companyId,
    workspaceId,
    baseSnapshotId: "snapshot-1",
    name: `Cenário ${id}`,
    createdAt: new Date("2026-08-01T10:00:00.000Z"),
  })
}

function createWorkspaceSource(
  workspaces: readonly OrganizationPlanningWorkspace[],
): PlanningWorkspaceSource {
  return {
    async list(requestedCompanyId) {
      assert.equal(requestedCompanyId, companyId)
      return workspaces
    },
  }
}

function createScenarioSource(
  scenarios: readonly PlanningScenario[],
): PlanningScenarioSource {
  return {
    async list(requestedCompanyId) {
      assert.equal(requestedCompanyId, companyId)
      return scenarios
    },
  }
}

test("resolve workspace e cenário quando existe exatamente um de cada", async () => {
  const workspace = createWorkspace("workspace-1")
  const scenario = createScenario(
    "scenario-1",
    workspace.id,
  )

  const provider =
    new PlanningExecutiveContextProvider(
      companyId,
      createWorkspaceSource([workspace]),
      createScenarioSource([scenario]),
    )

  const result = await provider.load()

  assert.deepEqual(result, {
    companyId,
    workspaceId: "workspace-1",
    scenarioId: "scenario-1",
  })
})

test("não escolhe workspace quando existem múltiplos", async () => {
  const provider =
    new PlanningExecutiveContextProvider(
      companyId,
      createWorkspaceSource([
        createWorkspace("workspace-1"),
        createWorkspace("workspace-2"),
      ]),
      createScenarioSource([]),
    )

  const result = await provider.load()

  assert.equal(result.workspaceId, null)
})

test("não escolhe cenário quando existem múltiplos", async () => {
  const workspace = createWorkspace("workspace-1")

  const provider =
    new PlanningExecutiveContextProvider(
      companyId,
      createWorkspaceSource([workspace]),
      createScenarioSource([
        createScenario("scenario-1", workspace.id),
        createScenario("scenario-2", workspace.id),
      ]),
    )

  const result = await provider.load()

  assert.equal(result.scenarioId, null)
})

test("representa ausência de workspace e cenário", async () => {
  const provider =
    new PlanningExecutiveContextProvider(
      companyId,
      createWorkspaceSource([]),
      createScenarioSource([]),
    )

  const result = await provider.load()

  assert.deepEqual(result, {
    companyId,
    workspaceId: null,
    scenarioId: null,
  })
})

test("não associa cenário único a workspace ambíguo", async () => {
  const workspaceOne = createWorkspace("workspace-1")
  const workspaceTwo = createWorkspace("workspace-2")
  const scenario = createScenario(
    "scenario-1",
    workspaceOne.id,
  )

  const provider =
    new PlanningExecutiveContextProvider(
      companyId,
      createWorkspaceSource([
        workspaceOne,
        workspaceTwo,
      ]),
      createScenarioSource([scenario]),
    )

  const result = await provider.load()

  assert.deepEqual(result, {
    companyId,
    workspaceId: null,
    scenarioId: null,
  })
})
