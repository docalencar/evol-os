import type {
  OrganizationEntity,
} from "../types/organization-entity"
import type {
  OrganizationSyncOperation,
} from "../types/organization-sync-operation"
import type {
  OrganizationSyncExecutionDetailsViewModel,
  OrganizationSyncExecutionNoticeViewModel,
  OrganizationSyncExecutionStatus,
  OrganizationSyncExecutionSummaryItemViewModel,
} from "../view-models/organization-sync-execution-details-view-model"

type ExecutionItemSummary = {
  appliedItems: number
  skippedItems: number
  failedItems: number
}

type ExecutionNotice = {
  itemId: string
  entity: OrganizationEntity
  operation: OrganizationSyncOperation
  message: string
}

export type OrganizationSyncExecutionTimelineRecord = {
  id: string
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
  created_at: string
}

const ENTITY_LABELS: Record<
  OrganizationEntity,
  string
> = {
  department: "Departamentos",
  team: "Times",
  position: "Cargos",
  employee: "Colaboradores",
}

const OPERATION_LABELS: Record<
  OrganizationSyncOperation,
  string
> = {
  create: "Criações",
  update: "Atualizações",
  move: "Movimentações",
  archive: "Arquivamentos",
  restore: "Restaurações",
  unchanged: "Sem alterações",
  conflict: "Conflitos",
}

const ENTITY_KEYS: OrganizationEntity[] = [
  "department",
  "team",
  "position",
  "employee",
]

const OPERATION_KEYS: OrganizationSyncOperation[] = [
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

function readNonNegativeNumber(
  value: unknown
) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  )
    ? value
    : 0
}

function readItemSummary(
  value: unknown
): ExecutionItemSummary {
  if (!isRecord(value)) {
    return {
      appliedItems: 0,
      skippedItems: 0,
      failedItems: 0,
    }
  }

  return {
    appliedItems: readNonNegativeNumber(
      value.appliedItems
    ),
    skippedItems: readNonNegativeNumber(
      value.skippedItems
    ),
    failedItems: readNonNegativeNumber(
      value.failedItems
    ),
  }
}

function presentEntitySummary(
  value: unknown
): OrganizationSyncExecutionSummaryItemViewModel[] {
  const summary = isRecord(value)
    ? value
    : {}

  return ENTITY_KEYS.map((entity) => ({
    key: entity,
    label: ENTITY_LABELS[entity],
    ...readItemSummary(summary[entity]),
  }))
}

function presentOperationSummary(
  value: unknown
): OrganizationSyncExecutionSummaryItemViewModel[] {
  const summary = isRecord(value)
    ? value
    : {}

  return OPERATION_KEYS.map((operation) => ({
    key: operation,
    label: OPERATION_LABELS[operation],
    ...readItemSummary(summary[operation]),
  }))
}

function isOrganizationEntity(
  value: unknown
): value is OrganizationEntity {
  return (
    typeof value === "string" &&
    ENTITY_KEYS.includes(
      value as OrganizationEntity
    )
  )
}

function isOrganizationOperation(
  value: unknown
): value is OrganizationSyncOperation {
  return (
    typeof value === "string" &&
    OPERATION_KEYS.includes(
      value as OrganizationSyncOperation
    )
  )
}

function readNotice(
  value: unknown
): ExecutionNotice | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.itemId !== "string" ||
    !isOrganizationEntity(value.entity) ||
    !isOrganizationOperation(
      value.operation
    ) ||
    typeof value.message !== "string"
  ) {
    return null
  }

  return {
    itemId: value.itemId,
    entity: value.entity,
    operation: value.operation,
    message: value.message,
  }
}

function presentNotices(
  value: unknown
): OrganizationSyncExecutionNoticeViewModel[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    const notice = readNotice(item)

    if (!notice) {
      return []
    }

    return [{
      itemId: notice.itemId,
      entityLabel:
        ENTITY_LABELS[notice.entity],
      operationLabel:
        OPERATION_LABELS[
          notice.operation
        ],
      message: notice.message,
    }]
  })
}

function getStatus(
  record: OrganizationSyncExecutionTimelineRecord
): OrganizationSyncExecutionStatus {
  if (record.failed_items > 0) {
    return "with_errors"
  }

  if (record.applied_items > 0) {
    return "success"
  }

  return "no_changes"
}

function getStatusLabel(
  status: OrganizationSyncExecutionStatus
) {
  switch (status) {
    case "success":
      return "Sucesso"

    case "with_errors":
      return "Concluída com erros"

    case "no_changes":
      return "Sem alterações"
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Fortaleza",
    }
  ).format(new Date(value))
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs} ms`
  }

  return `${(
    durationMs / 1000
  ).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })} s`
}

export function presentOrganizationSyncExecutionDetails(
  record: OrganizationSyncExecutionTimelineRecord
): OrganizationSyncExecutionDetailsViewModel {
  const status = getStatus(record)

  return {
    id: record.id,
    status,
    statusLabel:
      getStatusLabel(status),
    executedAtLabel:
      formatDateTime(record.created_at),
    startedAtLabel:
      formatDateTime(record.started_at),
    finishedAtLabel:
      formatDateTime(record.finished_at),
    durationLabel:
      formatDuration(record.duration_ms),

    metrics: [
      {
        key: "applied",
        label: "Aplicados",
        value: record.applied_items,
        description:
          "Itens alterados com sucesso.",
      },
      {
        key: "skipped",
        label: "Ignorados",
        value: record.skipped_items,
        description:
          "Itens sem alteração aplicável.",
      },
      {
        key: "failed",
        label: "Com erro",
        value: record.failed_items,
        description:
          "Itens que não foram aplicados.",
      },
      {
        key: "duration",
        label: "Duração",
        value:
          formatDuration(
            record.duration_ms
          ),
        description:
          "Tempo total da execução.",
      },
    ],

    entitySummary:
      presentEntitySummary(
        record.entity_summary
      ),

    operationSummary:
      presentOperationSummary(
        record.operation_summary
      ),

    warnings:
      presentNotices(record.warnings),

    errors:
      presentNotices(record.errors),

    historyHref:
      "/app/company/sync-history",
  }
}
