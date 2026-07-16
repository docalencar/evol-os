import Link from "next/link"

import {
  DataTable,
} from "@/components/shared/data-table"
import {
  Badge,
} from "@/components/ui/badge"
import {
  Button,
} from "@/components/ui/button"

import type {
  OrganizationSyncHistoryItemViewModel,
  OrganizationSyncHistoryStatus,
} from "../view-models/organization-sync-history-view-model"

type OrganizationSyncHistoryTableProps = {
  items: OrganizationSyncHistoryItemViewModel[]
}

function getStatusClassName(
  status: OrganizationSyncHistoryStatus
) {
  switch (status) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"

    case "with_errors":
      return "border-red-200 bg-red-50 text-red-700"

    case "no_changes":
      return "border-slate-200 bg-slate-50 text-slate-700"
  }
}

export function OrganizationSyncHistoryTable({
  items,
}: OrganizationSyncHistoryTableProps) {
  return (
    <DataTable
      title="Execuções"
      data={items}
      rowKey={(item) => item.id}
      emptyMessage="Nenhuma sincronização foi executada ainda."
      columns={[
        {
          key: "execution",
          header: "Execução",
          render: (item) => (
            <div>
              <p className="font-medium text-slate-900">
                {item.executedAtLabel}
              </p>

              <p className="text-sm text-slate-500">
                Duração: {item.durationLabel}
              </p>
            </div>
          ),
        },
        {
          key: "applied",
          header: "Aplicados",
          render: (item) =>
            item.appliedItems,
        },
        {
          key: "skipped",
          header: "Ignorados",
          render: (item) =>
            item.skippedItems,
        },
        {
          key: "failed",
          header: "Erros",
          render: (item) =>
            item.failedItems,
        },
        {
          key: "status",
          header: "Status",
          render: (item) => (
            <Badge
              className={getStatusClassName(
                item.status
              )}
            >
              {item.statusLabel}
            </Badge>
          ),
        },
        {
          key: "actions",
          header: "Ações",
          render: (item) => (
            <Button
              size="sm"
              variant="secondary"
              nativeButton={false}
              render={
                <Link
                  href={item.detailsHref}
                />
              }
            >
              Ver detalhes
            </Button>
          ),
        },
      ]}
    />
  )
}
