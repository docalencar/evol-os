import {
  DashboardSection,
} from "@/components/dashboard/dashboard-section"
import {
  StatCard,
} from "@/components/dashboard/stat-card"
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
  OrganizationRollbackPreviewTone,
  OrganizationRollbackPreviewViewModel,
} from "../view-models/organization-rollback-preview-view-model"

type OrganizationRollbackPreviewProps = {
  rollback: OrganizationRollbackPreviewViewModel
}

const DECISION_STYLES: Record<
  OrganizationRollbackPreviewTone,
  {
    container: string
    badge: string
  }
> = {
  success: {
    container:
      "border-emerald-200 bg-emerald-50",
    badge:
      "border-emerald-200 bg-emerald-100 text-emerald-700",
  },
  warning: {
    container:
      "border-amber-200 bg-amber-50",
    badge:
      "border-amber-200 bg-amber-100 text-amber-700",
  },
  danger: {
    container:
      "border-red-200 bg-red-50",
    badge:
      "border-red-200 bg-red-100 text-red-700",
  },
}

export function OrganizationRollbackPreview({
  rollback,
}: OrganizationRollbackPreviewProps) {
  const decisionStyles =
    DECISION_STYLES[rollback.tone]

  return (
    <DashboardSection
      title="Prévia do rollback"
      description={`Plano de reversão gerado em ${rollback.generatedAtLabel}. Nenhuma informação foi alterada.`}
      actions={
        <Button
          type="button"
          disabled
        >
          Executar rollback
        </Button>
      }
    >
      <div className="space-y-6">
        <div
          className={`rounded-xl border p-5 ${decisionStyles.container}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">
                {rollback.title}
              </h3>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                {rollback.description}
              </p>
            </div>

            <Badge
              className={decisionStyles.badge}
            >
              {rollback.status === "available"
                ? "Disponível"
                : rollback.status === "partial"
                  ? "Parcial"
                  : "Indisponível"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rollback.metrics.map((metric) => (
            <StatCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
              description={metric.description}
            />
          ))}
        </div>

        <DataTable
          title="Operações de reversão"
          data={rollback.items}
          rowKey={(item) => item.key}
          emptyMessage="Nenhuma mutação reversível foi encontrada nesta execução."
          columns={[
            {
              key: "entity",
              header: "Entidade",
              render: (item) => (
                <div>
                  <p className="font-medium text-slate-900">
                    {item.entityLabel}
                  </p>

                  <p className="max-w-56 truncate text-xs text-slate-500">
                    ID: {item.entityId}
                  </p>
                </div>
              ),
            },
            {
              key: "sourceOperation",
              header: "Operação original",
              render: (item) =>
                item.sourceOperationLabel,
            },
            {
              key: "rollbackOperation",
              header: "Operação inversa",
              render: (item) =>
                item.rollbackOperationLabel,
            },
            {
              key: "status",
              header: "Status",
              render: (item) => (
                <div>
                  <Badge
                    className={
                      item.status === "ready"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }
                  >
                    {item.statusLabel}
                  </Badge>

                  {item.message ? (
                    <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
                      {item.message}
                    </p>
                  ) : null}
                </div>
              ),
            },
          ]}
        />

        <p className="text-sm text-slate-500">
          A execução efetiva do rollback será
          disponibilizada na próxima etapa.
        </p>
      </div>
    </DashboardSection>
  )
}
