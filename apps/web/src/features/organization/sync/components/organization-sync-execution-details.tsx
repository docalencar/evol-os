import Link from "next/link"

import {
  DashboardSection,
} from "@/components/dashboard/dashboard-section"
import {
  StatCard,
} from "@/components/dashboard/stat-card"
import {
  Badge,
} from "@/components/ui/badge"
import {
  Button,
} from "@/components/ui/button"

import type {
  OrganizationSyncExecutionDetailsViewModel,
  OrganizationSyncExecutionNoticeViewModel,
  OrganizationSyncExecutionStatus,
  OrganizationSyncExecutionSummaryItemViewModel,
} from "../view-models/organization-sync-execution-details-view-model"

type OrganizationSyncExecutionDetailsProps = {
  execution: OrganizationSyncExecutionDetailsViewModel
}

function getStatusClassName(
  status: OrganizationSyncExecutionStatus
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

function SummaryGrid({
  title,
  items,
}: {
  title: string
  items: OrganizationSyncExecutionSummaryItemViewModel[]
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">
        {title}
      </h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article
            key={item.key}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <h3 className="font-semibold text-slate-900">
              {item.label}
            </h3>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-emerald-50 p-2">
                <dt className="text-xs text-emerald-700">
                  Aplicados
                </dt>

                <dd className="mt-1 text-lg font-semibold text-emerald-800">
                  {item.appliedItems}
                </dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-2">
                <dt className="text-xs text-slate-600">
                  Ignorados
                </dt>

                <dd className="mt-1 text-lg font-semibold text-slate-800">
                  {item.skippedItems}
                </dd>
              </div>

              <div className="rounded-lg bg-red-50 p-2">
                <dt className="text-xs text-red-700">
                  Falhas
                </dt>

                <dd className="mt-1 text-lg font-semibold text-red-800">
                  {item.failedItems}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}

function NoticeSection({
  title,
  notices,
  tone,
  emptyMessage,
}: {
  title: string
  notices: OrganizationSyncExecutionNoticeViewModel[]
  tone: "warning" | "danger"
  emptyMessage: string
}) {
  const styles =
    tone === "danger"
      ? {
          container:
            "border-red-200 bg-red-50",
          title:
            "text-red-900",
          text:
            "text-red-700",
          badge:
            "border-red-200 bg-red-100 text-red-700",
        }
      : {
          container:
            "border-amber-200 bg-amber-50",
          title:
            "text-amber-900",
          text:
            "text-amber-700",
          badge:
            "border-amber-200 bg-amber-100 text-amber-700",
        }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">
        {title}
      </h2>

      {notices.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map(
            (notice, index) => (
              <article
                key={`${notice.itemId}-${index}`}
                className={`rounded-xl border p-4 ${styles.container}`}
              >
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={styles.badge}
                  >
                    {notice.entityLabel}
                  </Badge>

                  <Badge
                    className={styles.badge}
                  >
                    {notice.operationLabel}
                  </Badge>
                </div>

                <p
                  className={`mt-3 text-sm leading-6 ${styles.text}`}
                >
                  {notice.message}
                </p>
              </article>
            )
          )}
        </div>
      )}
    </section>
  )
}

export function OrganizationSyncExecutionDetails({
  execution,
}: OrganizationSyncExecutionDetailsProps) {
  return (
    <DashboardSection
      title="Detalhes da sincronização"
      description={`Execução registrada em ${execution.executedAtLabel}.`}
      actions={
        <Button
          variant="secondary"
          nativeButton={false}
          render={
            <Link
              href={
                execution.historyHref
              }
            />
          }
        >
          Voltar ao histórico
        </Button>
      }
    >
      <div className="space-y-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Período da execução
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {execution.startedAtLabel}
                {" até "}
                {execution.finishedAtLabel}
              </p>
            </div>

            <Badge
              className={getStatusClassName(
                execution.status
              )}
            >
              {execution.statusLabel}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {execution.metrics.map(
            (metric) => (
              <StatCard
                key={metric.key}
                label={metric.label}
                value={metric.value}
                description={
                  metric.description
                }
              />
            )
          )}
        </div>

        <SummaryGrid
          title="Resumo por entidade"
          items={
            execution.entitySummary
          }
        />

        <SummaryGrid
          title="Resumo por operação"
          items={
            execution.operationSummary
          }
        />

        <div className="grid gap-8 xl:grid-cols-2">
          <NoticeSection
            title="Avisos"
            notices={
              execution.warnings
            }
            tone="warning"
            emptyMessage="Nenhum aviso foi registrado nesta execução."
          />

          <NoticeSection
            title="Erros"
            notices={
              execution.errors
            }
            tone="danger"
            emptyMessage="Nenhum erro foi registrado nesta execução."
          />
        </div>
      </div>
    </DashboardSection>
  )
}
