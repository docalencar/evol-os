import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  OrganizationSyncExecutionError,
  organizationSyncErrorMessage,
} from "../../../organization/sync/services/organization-sync-execution-errors"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const action = read("./apply-organization-sync-plan-action.ts")
const adapter = read(
  "../../../organization/sync/services/execute-organization-sync-plan.ts"
)
const panel = read("../components/employee-import-action-panel.tsx")
const planner = read("./create-employee-import-sync-plan-action.ts")
const timelineRepo = read(
  "../../../organization/sync/repositories/organization-timeline-repository.ts"
)

test("A. the active Apply path executes the trusted DB boundary", () => {
  assert.match(adapter, /apply_tenant_organization_sync_plan_v1/)
  assert.match(action, /executeOrganizationSyncPlan\(/)
  // The action reaches the boundary through the sync server barrel.
  assert.match(action, /from "@\/features\/organization\/sync\/server"/)
})

test("B. p_company_id is passed to the boundary", () => {
  assert.match(adapter, /p_company_id:\s*companyId/)
})

test("C. p_execution_id is threaded end to end", () => {
  assert.match(adapter, /p_execution_id:\s*executionId/)
  // The action receives a second execution-id argument and forwards it.
  assert.match(
    action,
    /applyOrganizationSyncPlanAction\(\s*input: SerializedOrganizationSyncPlan,\s*executionId: string/
  )
  assert.match(action, /executeOrganizationSyncPlan\(\{[\s\S]*executionId,[\s\S]*\}\)/)
})

test("D. p_items serializes exactly id/entity/operation/desired", () => {
  assert.match(adapter, /p_items:\s*actionableItems\.map\(toRpcItem\)/)
  for (const key of ["id:", "entity:", "operation:", "desired:"]) {
    assert.ok(adapter.includes(key), key)
  }
  // Only actionable operations are sent; unchanged/conflict stay skipped.
  assert.match(adapter, /ACTIONABLE_OPERATIONS/)
  assert.match(adapter, /skippedItems = plan\.items\.length - actionableItems\.length/)
})

test("E. the same execution_id is reused across retries of one Apply intent", () => {
  // Minted only when absent, so a retry of the same plan reuses it.
  assert.match(panel, /if \(!executionIdRef\.current\) \{\s*executionIdRef\.current = newSubmissionId\(\)/)
  // The Apply handler does NOT reset the id (a failed Apply keeps the identity).
  const handleImport = panel.slice(
    panel.indexOf("function handleImport"),
    panel.indexOf("if (result)")
  )
  assert.doesNotMatch(handleImport, /executionIdRef\.current = null/)
})

test("F. a new plan / restart mints a fresh execution_id", () => {
  // New analysis discards the prior intent.
  const handleAnalyze = panel.slice(
    panel.indexOf("function handleAnalyze"),
    panel.indexOf("function handleImport")
  )
  assert.match(handleAnalyze, /executionIdRef\.current = null/)
  // Both restart controls (Voltar, Sincronizar outra planilha) reset it too.
  const resets = panel.match(/executionIdRef\.current = null/g) ?? []
  assert.ok(resets.length >= 3, `expected >=3 resets, saw ${resets.length}`)
})

test("G. the active Apply path no longer calls the legacy coordinator/engine", () => {
  for (const source of [action, adapter]) {
    assert.doesNotMatch(source, /applyOrganizationSyncCoordinator/)
    assert.doesNotMatch(source, /applyOrganizationSyncPlan\b/)
    assert.doesNotMatch(source, /applyDepartmentSyncItem|applyTeamSyncItem|applyPositionSyncItem|applyEmployeeSyncItem/)
  }
})

test("H. the active Apply path no longer persists the Timeline in app code", () => {
  for (const source of [action, adapter]) {
    assert.doesNotMatch(source, /persistOrganizationTimeline/)
  }
})

test("I. the active Apply path performs no direct-DML insert", () => {
  for (const source of [action, adapter]) {
    assert.doesNotMatch(source, /\.from\(/)
    assert.doesNotMatch(source, /\.insert\(/)
  }
})

test("J. applied/skipped/failed counts map correctly", () => {
  assert.match(adapter, /appliedItems:\s*result\.appliedItems/)
  assert.match(adapter, /failedItems:\s*result\.failedItems/)
  // Skipped is derived app-side because the DB never saw those items.
  assert.match(adapter, /skippedItems,/)
  // The action still delegates the count/message presentation, unchanged.
  assert.match(action, /presentApplyOrganizationSyncResult\(report\)/)
})

test("K. receipts map to the stable itemId/entity/operation/entityId shape", () => {
  assert.match(adapter, /receipts:\s*result\.receipts\.map/)
  for (const key of ["itemId: receipt.itemId", "entity: receipt.entity", "operation: receipt.operation", "entityId: receipt.entityId"]) {
    assert.ok(adapter.includes(key), key)
  }
})

test("L. a stable code maps to safe PT-BR copy", () => {
  const dep = organizationSyncErrorMessage("SYNC_DEPENDENCY_NOT_FOUND")
  assert.ok(dep.length > 0)
  assert.doesNotMatch(dep, /SYNC_|SQL|permission denied/i)
  // Delegated (shared) code still resolves to its canonical copy.
  const seniority = organizationSyncErrorMessage("SENIORITY_LEVEL_NOT_FOUND")
  assert.ok(seniority.length > 0)
  assert.doesNotMatch(seniority, /SENIORITY_LEVEL_NOT_FOUND/)
})

test("M. an unknown code falls back to safe generic copy", () => {
  const unknown = organizationSyncErrorMessage("SOME_RAW_PG_TEXT_42501")
  assert.ok(unknown.length > 0)
  assert.doesNotMatch(unknown, /42501|SOME_RAW_PG_TEXT/)
})

test("N. SYNC_EXECUTION_CONFLICT is user-safe and thrown safely", () => {
  const conflict = organizationSyncErrorMessage("SYNC_EXECUTION_CONFLICT")
  assert.ok(conflict.length > 0)
  assert.doesNotMatch(conflict, /SYNC_EXECUTION_CONFLICT|SQLSTATE|23505/)
  const error = new OrganizationSyncExecutionError("SYNC_EXECUTION_CONFLICT")
  assert.equal(error.message, conflict)
  assert.doesNotMatch(error.message, /SYNC_EXECUTION_CONFLICT/)
})

test("O. review / dry-run planning behavior is untouched", () => {
  assert.match(planner, /createOrganizationSyncPlan\(/)
  assert.match(planner, /createOrganizationDryRunReport\(/)
  assert.match(panel, /OrganizationSyncReview/)
  assert.match(panel, /OrganizationSyncDryRun/)
})

test("P. sync-history read path stays compatible (still reads receipts; no new insert here)", () => {
  assert.match(timelineRepo, /receipts,/)
  // This slice adds no Timeline insert in app code — the DB RPC owns it.
  assert.doesNotMatch(adapter, /organization_sync_timeline/)
})
