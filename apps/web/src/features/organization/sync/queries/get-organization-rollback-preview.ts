import "server-only"

import {
  createOrganizationRollbackPlan,
} from "../engine/rollback"
import {
  presentOrganizationRollbackPreview,
} from "../presenters/present-organization-rollback-preview"
import {
  createOrganizationTimelineRepository,
} from "../repositories/organization-timeline-repository"
import type {
  OrganizationExecutionEntitySummary,
  OrganizationExecutionError,
  OrganizationExecutionOperationSummary,
  OrganizationExecutionReport,
  OrganizationExecutionWarning,
} from "../types/organization-execution-report"
import type {
  OrganizationEntity,
} from "../types/organization-entity"
import type {
  OrganizationMutationReceipt,
} from "../types/organization-mutation-receipt"
import type {
  OrganizationSyncOperation,
} from "../types/organization-sync-operation"
import type {
  OrganizationRollbackPreviewViewModel,
} from "../view-models/organization-rollback-preview-view-model"

type OrganizationRollbackTimelineRecord = {
  started_at: string
  finished_at: string
  duration_ms: number
  applied_items: number
  skipped_items: number
  failed_items: number
  entity_summary: unknown
  operation_summary: unknown
  warnings: unknown
  errors: unknown
  receipts: unknown
}

const ENTITIES: OrganizationEntity[] = [
  "department",
  "team",
  "position",
  "employee",
]

const OPERATIONS: OrganizationSyncOperation[] = [
  "create",
  "update",
  "move",
  "archive",
  "restore",
  "unchanged",
  "conflict",
]

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isEntity(
  value: unknown
): value is OrganizationEntity {
  return (
    typeof value === "string" &&
    ENTITIES.includes(
      value as OrganizationEntity
    )
  )
}

function isOperation(
  value: unknown
): value is OrganizationSyncOperation {
  return (
    typeof value === "string" &&
    OPERATIONS.includes(
      value as OrganizationSyncOperation
    )
  )
}

function readReceipts(
  value: unknown
): OrganizationMutationReceipt[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((receipt) => {
    if (!isRecord(receipt)) {
      return []
    }

    if (
      typeof receipt.itemId !== "string" ||
      !isEntity(receipt.entity) ||
      !isOperation(receipt.operation) ||
      typeof receipt.entityId !== "string"
    ) {
      return []
    }

    return [{
      itemId: receipt.itemId,
      entity: receipt.entity,
      operation: receipt.operation,
      entityId: receipt.entityId,
    }]
  })
}

function deserializeExecutionReport(
  record: OrganizationRollbackTimelineRecord
): OrganizationExecutionReport {
  return {
    startedAt: new Date(record.started_at),
    finishedAt: new Date(record.finished_at),
    duration: record.duration_ms,
    appliedItems: record.applied_items,
    skippedItems: record.skipped_items,
    failedItems: record.failed_items,

    entitySummary:
      record.entity_summary as OrganizationExecutionEntitySummary,

    operationSummary:
      record.operation_summary as OrganizationExecutionOperationSummary,

    warnings:
      record.warnings as OrganizationExecutionWarning[],

    errors:
      record.errors as OrganizationExecutionError[],

    receipts:
      readReceipts(record.receipts),
  }
}

export async function getOrganizationRollbackPreview(
  companyId: string,
  executionId: string
): Promise<OrganizationRollbackPreviewViewModel | null> {
  const repository =
    await createOrganizationTimelineRepository()

  const { data, error } =
    await repository.findById(
      companyId,
      executionId
    )

  if (error) {
    throw new Error(
      `Não foi possível preparar a prévia do rollback: ${error.message}`
    )
  }

  if (!data) {
    return null
  }

  const report =
    deserializeExecutionReport(
      data as OrganizationRollbackTimelineRecord
    )

  const plan =
    createOrganizationRollbackPlan(report)

  return presentOrganizationRollbackPreview(
    plan
  )
}
