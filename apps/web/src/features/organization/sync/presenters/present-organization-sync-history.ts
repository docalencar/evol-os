import type {
  OrganizationSyncHistoryItemViewModel,
  OrganizationSyncHistoryStatus,
  OrganizationSyncHistoryViewModel,
} from "../view-models/organization-sync-history-view-model"

export type OrganizationSyncTimelineRecord = {
  id: string
  started_at: string
  finished_at: string
  duration_ms: number
  applied_items: number
  skipped_items: number
  failed_items: number
  created_at: string
}

function getStatus(
  record: OrganizationSyncTimelineRecord
): OrganizationSyncHistoryStatus {
  if (record.failed_items > 0) {
    return "with_errors"
  }

  if (record.applied_items > 0) {
    return "success"
  }

  return "no_changes"
}

function getStatusLabel(
  status: OrganizationSyncHistoryStatus
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

function formatExecutedAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(new Date(value))
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs} ms`
  }

  const seconds = durationMs / 1000

  return `${seconds.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} s`
}

function presentItem(
  record: OrganizationSyncTimelineRecord
): OrganizationSyncHistoryItemViewModel {
  const status = getStatus(record)

  return {
    id: record.id,
    executedAtLabel: formatExecutedAt(
      record.created_at
    ),
    durationLabel: formatDuration(
      record.duration_ms
    ),
    appliedItems: record.applied_items,
    skippedItems: record.skipped_items,
    failedItems: record.failed_items,
    status,
    statusLabel: getStatusLabel(status),
    detailsHref:
      `/app/company/sync-history/${record.id}`,
  }
}

export function presentOrganizationSyncHistory(
  records: OrganizationSyncTimelineRecord[]
): OrganizationSyncHistoryViewModel {
  return {
    totalExecutions: records.length,
    items: records.map(presentItem),
  }
}
