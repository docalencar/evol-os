import type {
  OrganizationExecutionReport,
} from "../../types/organization-execution-report"
import type {
  OrganizationEntity,
} from "../../types/organization-entity"
import type {
  OrganizationMutationReceipt,
} from "../../types/organization-mutation-receipt"
import type {
  OrganizationRollbackItem,
  OrganizationRollbackPlan,
} from "../../types/organization-rollback-plan"

const ROLLBACK_ENTITY_ORDER: Record<
  OrganizationEntity,
  number
> = {
  employee: 1,
  position: 2,
  team: 3,
  department: 4,
}

function compareRollbackItems(
  firstItem: OrganizationRollbackItem,
  secondItem: OrganizationRollbackItem
) {
  const entityOrder =
    ROLLBACK_ENTITY_ORDER[firstItem.entity] -
    ROLLBACK_ENTITY_ORDER[secondItem.entity]

  if (entityOrder !== 0) {
    return entityOrder
  }

  return firstItem.receiptItemId.localeCompare(
    secondItem.receiptItemId,
    "pt-BR",
    {
      numeric: true,
      sensitivity: "base",
    }
  )
}

function createRollbackItem(
  receipt: OrganizationMutationReceipt
): OrganizationRollbackItem {
  if (receipt.operation === "create") {
    return {
      receiptItemId: receipt.itemId,
      entityId: receipt.entityId,
      entity: receipt.entity,
      sourceOperation: receipt.operation,
      rollbackOperation: "archive",
      status: "ready",
      message: null,
    }
  }

  return {
    receiptItemId: receipt.itemId,
    entityId: receipt.entityId,
    entity: receipt.entity,
    sourceOperation: receipt.operation,
    rollbackOperation: null,
    status: "unsupported",
    message:
      `O rollback da operação "${receipt.operation}" ainda exige dados anteriores da entidade.`,
  }
}

export function createOrganizationRollbackPlan(
  report: OrganizationExecutionReport
): OrganizationRollbackPlan {
  const items = report.receipts
    .map(createRollbackItem)
    .sort(compareRollbackItems)

  const readyItems = items.filter(
    (item) => item.status === "ready"
  ).length

  const unsupportedItems = items.filter(
    (item) => item.status === "unsupported"
  ).length

  return {
    generatedAt: new Date(),
    executionStartedAt: report.startedAt,
    executionFinishedAt: report.finishedAt,
    canRollback:
      readyItems > 0 &&
      unsupportedItems === 0,
    totalItems: items.length,
    readyItems,
    unsupportedItems,
    items,
  }
}
