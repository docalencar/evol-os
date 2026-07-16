import type {
  OrganizationExecutionError,
} from "../../types/organization-execution-report"
import type {
  OrganizationMutationReceipt,
} from "../../types/organization-mutation-receipt"
import type {
  OrganizationSyncItem,
} from "../../types/organization-sync-item"
import type {
  OrganizationSyncPlan,
} from "../../types/organization-sync-plan"

export type OrganizationSyncApplyOperation =
  | "create"
  | "update"
  | "move"
  | "archive"
  | "restore"

export type OrganizationSyncApplyHandler = (
  item: OrganizationSyncItem
) => Promise<OrganizationMutationReceipt>

export type OrganizationSyncApplyHandlers = Record<
  OrganizationSyncApplyOperation,
  OrganizationSyncApplyHandler
>

export type OrganizationSyncApplyError =
  OrganizationExecutionError

export type OrganizationSyncApplyItemStatus =
  | "applied"
  | "skipped"
  | "failed"

export type OrganizationSyncApplyItemResult = {
  itemId: string
  entity: OrganizationSyncItem["entity"]
  operation: OrganizationSyncItem["operation"]
  status: OrganizationSyncApplyItemStatus
  message: string | null
}

export type OrganizationSyncApplyResult = {
  success: boolean
  totalItems: number
  appliedItems: number
  skippedItems: number
  failedItems: number
  items: OrganizationSyncApplyItemResult[]
  errors: OrganizationSyncApplyError[]
  receipts: OrganizationMutationReceipt[]
}

const ENTITY_EXECUTION_ORDER: Record<
  OrganizationSyncItem["entity"],
  number
> = {
  department: 1,
  team: 2,
  position: 3,
  employee: 4,
}

const ACTIONABLE_OPERATIONS =
  new Set<OrganizationSyncApplyOperation>([
    "create",
    "update",
    "move",
    "archive",
    "restore",
  ])

function isActionableOperation(
  operation: OrganizationSyncItem["operation"]
): operation is OrganizationSyncApplyOperation {
  return ACTIONABLE_OPERATIONS.has(
    operation as OrganizationSyncApplyOperation
  )
}

function sortItemsForApplication(
  items: OrganizationSyncItem[]
) {
  return [...items].sort((firstItem, secondItem) => {
    const entityOrder =
      ENTITY_EXECUTION_ORDER[firstItem.entity] -
      ENTITY_EXECUTION_ORDER[secondItem.entity]

    if (entityOrder !== 0) {
      return entityOrder
    }

    return firstItem.title.localeCompare(
      secondItem.title,
      "pt-BR",
      {
        numeric: true,
        sensitivity: "base",
      }
    )
  })
}

function getSkippedItemMessage(
  item: OrganizationSyncItem
) {
  if (item.operation === "conflict") {
    return "Item não aplicado porque possui um conflito que exige revisão."
  }

  return "Item sem alterações aplicáveis."
}

export async function applyOrganizationSyncPlan(
  plan: OrganizationSyncPlan,
  handlers: OrganizationSyncApplyHandlers
): Promise<OrganizationSyncApplyResult> {
  const orderedItems = sortItemsForApplication(
    plan.items
  )

  let appliedItems = 0
  let skippedItems = 0

  const items: OrganizationSyncApplyItemResult[] = []
  const errors: OrganizationSyncApplyError[] = []
  const receipts: OrganizationMutationReceipt[] = []

  for (const item of orderedItems) {
    if (!isActionableOperation(item.operation)) {
      skippedItems += 1

      items.push({
        itemId: item.id,
        entity: item.entity,
        operation: item.operation,
        status: "skipped",
        message: getSkippedItemMessage(item),
      })

      continue
    }

    try {
      const receipt =
        await handlers[item.operation](item)

      receipts.push(receipt)
      appliedItems += 1

      items.push({
        itemId: item.id,
        entity: item.entity,
        operation: item.operation,
        status: "applied",
        message: null,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível aplicar o item do plano."

      errors.push({
        itemId: item.id,
        entity: item.entity,
        operation: item.operation,
        message,
      })

      items.push({
        itemId: item.id,
        entity: item.entity,
        operation: item.operation,
        status: "failed",
        message,
      })
    }
  }

  return {
    success: errors.length === 0,
    totalItems: orderedItems.length,
    appliedItems,
    skippedItems,
    failedItems: errors.length,
    items,
    errors,
    receipts,
  }
}
