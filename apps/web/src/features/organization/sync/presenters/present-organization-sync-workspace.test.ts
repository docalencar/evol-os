import assert from "node:assert/strict"
import test from "node:test"

import type {
  OrganizationSyncItem,
} from "../types/organization-sync-item"
import type {
  OrganizationSyncPlan,
} from "../types/organization-sync-plan"

import {
  presentOrganizationSyncWorkspace,
} from "./present-organization-sync-workspace"

function item(
  entity: OrganizationSyncItem["entity"],
  operation: OrganizationSyncItem["operation"],
  title: string
): OrganizationSyncItem {
  return {
    id: `${entity}:${operation}:${title}`,
    entity,
    operation,
    severity: "info",
    title,
    description: "",
    current: null,
    desired: null,
  }
}

// A 3-row import → 3 departments + 3 positions + 3 collaborators created, plus
// pre-existing structures recognized as unchanged.
function threeRowPlan(): OrganizationSyncPlan {
  const items: OrganizationSyncItem[] = [
    ...[1, 2, 3].map((n) => item("department", "create", `Dept ${n}`)),
    ...[1, 2, 3].map((n) => item("position", "create", `Cargo ${n}`)),
    ...[1, 2, 3].map((n) => item("employee", "create", `Colab ${n}`)),
    ...[1, 2].map((n) => item("team", "unchanged", `Time ${n}`)),
  ]

  return {
    generatedAt: new Date("2026-01-01T12:00:00.000Z"),
    summary: {
      creates: 9,
      updates: 0,
      moves: 0,
      archives: 0,
      restores: 0,
      unchanged: 2,
      conflicts: 0,
    },
    items,
  }
}

test("the review leads with per-entity business outcomes, not aggregate counts", () => {
  const vm = presentOrganizationSyncWorkspace(threeRowPlan())
  assert.deepEqual(vm.plannedChanges, [
    "3 departamentos serão criados",
    "3 cargos serão criados",
    "3 colaboradores serão adicionados",
  ])
})

test("collaborators are 'adicionados', never 'pessoas'; no aggregate '9 novos registros'", () => {
  const vm = presentOrganizationSyncWorkspace(threeRowPlan())
  const blob = JSON.stringify(vm.plannedChanges)
  assert.doesNotMatch(blob, /pessoa/i)
  // The aggregate create count (9) is not the primary business phrasing.
  assert.doesNotMatch(blob, /9 (novos )?registros/i)
  assert.doesNotMatch(blob, /9 colaboradores/i)
})

test("pre-existing entities are described as recognized, not ignored", () => {
  const vm = presentOrganizationSyncWorkspace(threeRowPlan())
  assert.match(
    vm.alreadyRecognizedMessage ?? "",
    /já existentes foram reconhecidas/i
  )
  assert.doesNotMatch(JSON.stringify(vm), /ignorad/i)
  assert.doesNotMatch(JSON.stringify(vm), /sem alteração: \d/i)
})

test("singular PT-BR for a single collaborator / structure", () => {
  const plan: OrganizationSyncPlan = {
    generatedAt: new Date("2026-01-01T12:00:00.000Z"),
    summary: {
      creates: 3,
      updates: 0,
      moves: 0,
      archives: 0,
      restores: 0,
      unchanged: 0,
      conflicts: 0,
    },
    items: [
      item("department", "create", "Dept"),
      item("position", "create", "Cargo"),
      item("employee", "create", "Colab"),
    ],
  }
  const vm = presentOrganizationSyncWorkspace(plan)
  assert.deepEqual(vm.plannedChanges, [
    "1 departamento será criado",
    "1 cargo será criado",
    "1 colaborador será adicionado",
  ])
  // No pre-existing entities → no recognition line.
  assert.equal(vm.alreadyRecognizedMessage, null)
})

test("a plan with applicable creates is NOT a no-change plan", () => {
  const vm = presentOrganizationSyncWorkspace(threeRowPlan())
  assert.equal(vm.noChange, false)
})

test("a fully-unchanged plan is flagged noChange (nothing to apply)", () => {
  const plan: OrganizationSyncPlan = {
    generatedAt: new Date("2026-01-01T12:00:00.000Z"),
    summary: {
      creates: 0,
      updates: 0,
      moves: 0,
      archives: 0,
      restores: 0,
      unchanged: 3,
      conflicts: 0,
    },
    items: [
      item("department", "unchanged", "Dept"),
      item("position", "unchanged", "Cargo"),
      item("employee", "unchanged", "Colab"),
    ],
  }
  const vm = presentOrganizationSyncWorkspace(plan)
  assert.equal(vm.noChange, true)
  assert.deepEqual(vm.plannedChanges, [])
})

test("teams that are actually created are surfaced correctly", () => {
  const plan: OrganizationSyncPlan = {
    generatedAt: new Date("2026-01-01T12:00:00.000Z"),
    summary: {
      creates: 2,
      updates: 0,
      moves: 0,
      archives: 0,
      restores: 0,
      unchanged: 0,
      conflicts: 0,
    },
    items: [
      item("team", "create", "Time A"),
      item("team", "create", "Time B"),
    ],
  }
  const vm = presentOrganizationSyncWorkspace(plan)
  assert.deepEqual(vm.plannedChanges, ["2 times serão criados"])
})
