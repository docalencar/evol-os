import "server-only"

import { z } from "zod"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  OrganizationSyncExecutionError,
  organizationSyncErrorMessage,
} from "./organization-sync-execution-errors"
import type {
  OrganizationExecutionReport,
} from "../types/organization-execution-report"
import type {
  OrganizationSyncItem,
} from "../types/organization-sync-item"
import type {
  OrganizationSyncPlan,
} from "../types/organization-sync-plan"

// The operations the trusted execution boundary can act on. Non-actionable
// items (unchanged / conflict) are never sent — they stay "skipped", exactly as
// the previous coordinator treated them.
const ACTIONABLE_OPERATIONS = new Set([
  "create",
  "update",
  "move",
  "archive",
  "restore",
])

export type ExecuteOrganizationSyncPlanInput = {
  companyId: string
  executionId: string
  plan: OrganizationSyncPlan
}

const entitySchema = z.enum([
  "department",
  "team",
  "position",
  "employee",
])

const operationSchema = z.enum([
  "create",
  "update",
  "move",
  "archive",
  "restore",
  "unchanged",
  "conflict",
])

const itemSummarySchema = z.object({
  appliedItems: z.number().int().nonnegative(),
  skippedItems: z.number().int().nonnegative(),
  failedItems: z.number().int().nonnegative(),
})

// Shape of the jsonb returned by apply_tenant_organization_sync_plan_v1.
const executionResultSchema = z.object({
  status: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  duration: z.number().int().nonnegative(),
  appliedItems: z.number().int().nonnegative(),
  skippedItems: z.number().int().nonnegative(),
  failedItems: z.number().int().nonnegative(),
  entitySummary: z.object({
    department: itemSummarySchema,
    team: itemSummarySchema,
    position: itemSummarySchema,
    employee: itemSummarySchema,
  }),
  operationSummary: z.object({
    create: itemSummarySchema,
    update: itemSummarySchema,
    move: itemSummarySchema,
    archive: itemSummarySchema,
    restore: itemSummarySchema,
    unchanged: itemSummarySchema,
    conflict: itemSummarySchema,
  }),
  errors: z
    .array(
      z.object({
        itemId: z.string(),
        entity: entitySchema,
        operation: operationSchema,
        code: z.string(),
        message: z.string(),
      })
    )
    .default([]),
  receipts: z
    .array(
      z.object({
        itemId: z.string(),
        entity: entitySchema,
        operation: operationSchema,
        entityId: z.string(),
      })
    )
    .default([]),
})

function toRpcItem(item: OrganizationSyncItem) {
  // Only the fields the DB boundary needs; canonical entity/operation literals
  // are preserved verbatim. `desired` is passed through untouched.
  return {
    id: item.id,
    entity: item.entity,
    operation: item.operation,
    desired: item.desired,
  }
}

// Cut the approved plan over to the trusted DB execution boundary. Composes the
// existing create RPCs, owns item execution + receipts + counts + the Timeline
// row, and is idempotent per (companyId, executionId). Never surfaces raw
// database text: item failures carry safe codes and whole-execution refusals
// throw OrganizationSyncExecutionError with PT-BR copy.
export async function executeOrganizationSyncPlan({
  companyId,
  executionId,
  plan,
}: ExecuteOrganizationSyncPlanInput): Promise<OrganizationExecutionReport> {
  const actionableItems = plan.items.filter((item) =>
    ACTIONABLE_OPERATIONS.has(item.operation)
  )

  // Non-actionable items never reach the DB; they remain "skipped" so the
  // result totals stay conceptually identical to the previous engine.
  const skippedItems = plan.items.length - actionableItems.length

  const database = await createServerDatabase()

  const { data, error } = await database.rpc(
    "apply_tenant_organization_sync_plan_v1",
    {
      p_company_id: companyId,
      p_execution_id: executionId,
      p_items: actionableItems.map(toRpcItem),
    }
  )

  if (error) {
    // error.message may embed one of our stable codes (e.g.
    // SYNC_EXECUTION_CONFLICT, TENANT_AUTHORIZATION_DENIED); classify to safe
    // PT-BR and drop the raw text.
    throw new OrganizationSyncExecutionError(error.message)
  }

  const parsed = executionResultSchema.safeParse(data)

  if (!parsed.success) {
    throw new OrganizationSyncExecutionError("SYNC_ITEM_FAILED")
  }

  const result = parsed.data

  return {
    startedAt: new Date(result.startedAt),
    finishedAt: new Date(result.finishedAt),
    duration: result.duration,
    appliedItems: result.appliedItems,
    // App-computed: the DB never saw the skipped items.
    skippedItems,
    failedItems: result.failedItems,
    entitySummary: result.entitySummary,
    operationSummary: result.operationSummary,
    warnings: [],
    errors: result.errors.map((itemError) => ({
      itemId: itemError.itemId,
      entity: itemError.entity,
      operation: itemError.operation,
      // Centralised code -> PT-BR mapping; never the raw code or DB text.
      message: organizationSyncErrorMessage(itemError.code),
    })),
    receipts: result.receipts.map((receipt) => ({
      itemId: receipt.itemId,
      entity: receipt.entity,
      operation: receipt.operation,
      entityId: receipt.entityId,
    })),
  }
}
