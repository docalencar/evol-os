import assert from "node:assert/strict"
import test from "node:test"

import type {
  OrganizationDryRunReport,
} from "../types/organization-dry-run-report"

import {
  presentOrganizationDryRun,
} from "./present-organization-dry-run"

const zeroSummary = {
  totalItems: 0,
  applicableItems: 0,
  skippedItems: 0,
  blockedItems: 0,
}

function makeReport(
  overrides: Partial<OrganizationDryRunReport> = {}
): OrganizationDryRunReport {
  return {
    generatedAt: new Date("2026-01-01T12:00:00.000Z"),
    planGeneratedAt: new Date("2026-01-01T12:00:00.000Z"),
    decision: "safe",
    totalItems: 0,
    applicableItems: 0,
    skippedItems: 0,
    blockedItems: 0,
    entitySummary: {
      department: { ...zeroSummary },
      team: { ...zeroSummary },
      position: { ...zeroSummary },
      employee: { ...zeroSummary },
    },
    operationSummary: {
      create: { ...zeroSummary },
      update: { ...zeroSummary },
      move: { ...zeroSummary },
      archive: { ...zeroSummary },
      restore: { ...zeroSummary },
      unchanged: { ...zeroSummary },
      conflict: { ...zeroSummary },
    },
    warnings: [],
    blockers: [],
    ...overrides,
  }
}

test("no-change: analyzed items but nothing applicable/blocked => 'Nenhuma alteração necessária'", () => {
  const vm = presentOrganizationDryRun(
    makeReport({
      decision: "safe",
      totalItems: 9,
      applicableItems: 0,
      skippedItems: 9,
      blockedItems: 0,
    })
  )
  assert.equal(vm.noChange, true)
  assert.equal(vm.decision.status, "no-change")
  assert.equal(vm.decision.tone, "neutral")
  assert.equal(vm.decision.title, "Nenhuma alteração necessária")
  assert.match(vm.decision.description, /já estão sincronizados/i)
})

test("no-change never claims the plan can be applied or is 'safe'", () => {
  const vm = presentOrganizationDryRun(
    makeReport({ totalItems: 5, applicableItems: 0, skippedItems: 5 })
  )
  const blob = JSON.stringify(vm.decision)
  assert.doesNotMatch(blob, /O plano pode ser aplicado/i)
  assert.doesNotMatch(blob, /Sincronização segura/i)
  // Not framed as duplicate/error/conflict.
  assert.doesNotMatch(blob, /duplicad|erro|conflito|inválid/i)
})

test("a plan with applicable changes keeps the normal 'safe' decision", () => {
  const vm = presentOrganizationDryRun(
    makeReport({
      decision: "safe",
      totalItems: 3,
      applicableItems: 3,
      skippedItems: 0,
      blockedItems: 0,
    })
  )
  assert.equal(vm.noChange, false)
  assert.equal(vm.decision.status, "safe")
  assert.match(vm.decision.description, /O plano pode ser aplicado/i)
})

test("blocked plans keep their existing blocking behavior (not no-change)", () => {
  const vm = presentOrganizationDryRun(
    makeReport({
      decision: "blocked",
      totalItems: 4,
      applicableItems: 1,
      skippedItems: 0,
      blockedItems: 3,
    })
  )
  assert.equal(vm.noChange, false)
  assert.equal(vm.decision.status, "blocked")
})

test("an empty plan (no analyzed items) is not treated as a no-change import", () => {
  const vm = presentOrganizationDryRun(makeReport({ totalItems: 0 }))
  assert.equal(vm.noChange, false)
})
