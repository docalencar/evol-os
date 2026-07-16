import type {
  OrganizationDryRunBlocker,
  OrganizationDryRunEntitySummary,
  OrganizationDryRunItemSummary,
  OrganizationDryRunOperationSummary,
  OrganizationDryRunReport,
  OrganizationDryRunWarning,
} from "../../types/organization-dry-run-report"
import type {
  OrganizationSyncItem,
} from "../../types/organization-sync-item"
import type {
  OrganizationSyncPlan,
} from "../../types/organization-sync-plan"

type OrganizationDryRunItemStatus =
  | "applicable"
  | "skipped"
  | "blocked"

const APPLICABLE_OPERATIONS = new Set<
  OrganizationSyncItem["operation"]
>([
  "create",
  "update",
  "move",
  "archive",
  "restore",
])

function createEmptySummary(): OrganizationDryRunItemSummary {
  return {
    totalItems: 0,
    applicableItems: 0,
    skippedItems: 0,
    blockedItems: 0,
  }
}

function createEntitySummary(): OrganizationDryRunEntitySummary {
  return {
    department: createEmptySummary(),
    team: createEmptySummary(),
    position: createEmptySummary(),
    employee: createEmptySummary(),
  }
}

function createOperationSummary(): OrganizationDryRunOperationSummary {
  return {
    create: createEmptySummary(),
    update: createEmptySummary(),
    move: createEmptySummary(),
    archive: createEmptySummary(),
    restore: createEmptySummary(),
    unchanged: createEmptySummary(),
    conflict: createEmptySummary(),
  }
}

function getItemStatus(
  item: OrganizationSyncItem
): OrganizationDryRunItemStatus {
  if (item.operation === "conflict") {
    return "blocked"
  }

  if (APPLICABLE_OPERATIONS.has(item.operation)) {
    return "applicable"
  }

  return "skipped"
}

function incrementSummary(
  summary: OrganizationDryRunItemSummary,
  status: OrganizationDryRunItemStatus
) {
  summary.totalItems += 1

  if (status === "applicable") {
    summary.applicableItems += 1
    return
  }

  if (status === "blocked") {
    summary.blockedItems += 1
    return
  }

  summary.skippedItems += 1
}

function createWarning(
  item: OrganizationSyncItem
): OrganizationDryRunWarning | null {
  if (item.operation !== "archive") {
    return null
  }

  return {
    itemId: item.id,
    entity: item.entity,
    operation: item.operation,
    title: item.title,
    message:
      "Este item será arquivado. Confirme se a ausência na origem representa uma remoção intencional.",
  }
}

function createBlocker(
  item: OrganizationSyncItem
): OrganizationDryRunBlocker | null {
  if (item.operation !== "conflict") {
    return null
  }

  return {
    itemId: item.id,
    entity: item.entity,
    operation: item.operation,
    title: item.title,
    message:
      "Este item possui um conflito que precisa ser resolvido antes da sincronização.",
  }
}

export function createOrganizationDryRunReport(
  plan: OrganizationSyncPlan
): OrganizationDryRunReport {
  const entitySummary = createEntitySummary()
  const operationSummary = createOperationSummary()

  const warnings: OrganizationDryRunWarning[] = []
  const blockers: OrganizationDryRunBlocker[] = []

  let applicableItems = 0
  let skippedItems = 0
  let blockedItems = 0

  for (const item of plan.items) {
    const status = getItemStatus(item)

    incrementSummary(
      entitySummary[item.entity],
      status
    )

    incrementSummary(
      operationSummary[item.operation],
      status
    )

    if (status === "applicable") {
      applicableItems += 1
    } else if (status === "blocked") {
      blockedItems += 1
    } else {
      skippedItems += 1
    }

    const warning = createWarning(item)

    if (warning) {
      warnings.push(warning)
    }

    const blocker = createBlocker(item)

    if (blocker) {
      blockers.push(blocker)
    }
  }

  return {
    generatedAt: new Date(),
    planGeneratedAt: plan.generatedAt,
    canApply: blockedItems === 0,
    totalItems: plan.items.length,
    applicableItems,
    skippedItems,
    blockedItems,
    entitySummary,
    operationSummary,
    warnings,
    blockers,
  }
}
