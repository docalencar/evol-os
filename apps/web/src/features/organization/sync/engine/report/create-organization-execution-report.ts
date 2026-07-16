import type {
  OrganizationExecutionEntitySummary,
  OrganizationExecutionItemSummary,
  OrganizationExecutionOperationSummary,
  OrganizationExecutionReport,
  OrganizationExecutionWarning,
} from "../../types/organization-execution-report"
import type {
  OrganizationSyncApplyResult,
} from "../apply"

export type CreateOrganizationExecutionReportInput = {
  startedAt: Date
  finishedAt: Date
  result: OrganizationSyncApplyResult
}

function createEmptyItemSummary(): OrganizationExecutionItemSummary {
  return {
    appliedItems: 0,
    skippedItems: 0,
    failedItems: 0,
  }
}

function createEntitySummary(): OrganizationExecutionEntitySummary {
  return {
    department: createEmptyItemSummary(),
    team: createEmptyItemSummary(),
    position: createEmptyItemSummary(),
    employee: createEmptyItemSummary(),
  }
}

function createOperationSummary(): OrganizationExecutionOperationSummary {
  return {
    create: createEmptyItemSummary(),
    update: createEmptyItemSummary(),
    move: createEmptyItemSummary(),
    archive: createEmptyItemSummary(),
    restore: createEmptyItemSummary(),
    unchanged: createEmptyItemSummary(),
    conflict: createEmptyItemSummary(),
  }
}

function incrementSummary(
  summary: OrganizationExecutionItemSummary,
  status: "applied" | "skipped" | "failed"
) {
  if (status === "applied") {
    summary.appliedItems += 1
    return
  }

  if (status === "skipped") {
    summary.skippedItems += 1
    return
  }

  summary.failedItems += 1
}

function createWarnings(
  result: OrganizationSyncApplyResult
): OrganizationExecutionWarning[] {
  return result.items
    .filter(
      (item) =>
        item.status === "skipped" &&
        item.operation === "conflict"
    )
    .map((item) => ({
      itemId: item.itemId,
      entity: item.entity,
      operation: item.operation,
      message:
        item.message ??
        "Item ignorado durante a execução.",
    }))
}

export function createOrganizationExecutionReport({
  startedAt,
  finishedAt,
  result,
}: CreateOrganizationExecutionReportInput): OrganizationExecutionReport {
  const entitySummary = createEntitySummary()
  const operationSummary = createOperationSummary()

  for (const item of result.items) {
    incrementSummary(
      entitySummary[item.entity],
      item.status
    )

    incrementSummary(
      operationSummary[item.operation],
      item.status
    )
  }

  return {
    startedAt,
    finishedAt,
    duration: Math.max(
      0,
      finishedAt.getTime() - startedAt.getTime()
    ),
    appliedItems: result.appliedItems,
    skippedItems: result.skippedItems,
    failedItems: result.failedItems,
    entitySummary,
    operationSummary,
    warnings: createWarnings(result),
    errors: result.errors,
    receipts: result.receipts,
  }
}
