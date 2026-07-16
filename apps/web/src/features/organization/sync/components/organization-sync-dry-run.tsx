import {
  DashboardSection,
} from "@/components/dashboard/dashboard-section"
import {
  StatCard,
} from "@/components/dashboard/stat-card"
import {
  Badge,
} from "@/components/ui/badge"

import type {
  OrganizationDryRunDecisionTone,
  OrganizationDryRunNoticeViewModel,
  OrganizationDryRunViewModel,
} from "../view-models/organization-dry-run-view-model"

type OrganizationSyncDryRunProps = {
  dryRun: OrganizationDryRunViewModel
}

const DECISION_STYLES: Record<
  OrganizationDryRunDecisionTone,
  {
    containerClassName: string
    badgeClassName: string
  }
> = {
  success: {
    containerClassName:
      "border-emerald-200 bg-emerald-50",
    badgeClassName:
      "bg-emerald-100 text-emerald-700",
  },
  warning: {
    containerClassName:
      "border-amber-200 bg-amber-50",
    badgeClassName:
      "bg-amber-100 text-amber-700",
  },
  danger: {
    containerClassName:
      "border-red-200 bg-red-50",
    badgeClassName:
      "bg-red-100 text-red-700",
  },
}

function NoticeList({
  title,
  notices,
  tone,
}: {
  title: string
  notices: OrganizationDryRunNoticeViewModel[]
  tone: "warning" | "danger"
}) {
  if (notices.length === 0) {
    return null
  }

  const styles =
    tone === "danger"
      ? {
          section:
            "border-red-200 bg-red-50",
          label:
            "text-red-800",
          badge:
            "bg-red-100 text-red-700",
          description:
            "text-red-700",
        }
      : {
          section:
            "border-amber-200 bg-amber-50",
          label:
            "text-amber-800",
          badge:
            "bg-amber-100 text-amber-700",
          description:
            "text-amber-700",
        }

  return (
    <section
      className={`overflow-hidden rounded-xl border ${styles.section}`}
    >
      <header className="border-b border-current/10 px-4 py-3">
        <h3
          className={`font-semibold ${styles.label}`}
        >
          {title}
        </h3>
      </header>

      <div className="divide-y divide-current/10">
        {notices.map((notice) => (
          <article
            key={notice.itemId}
            className="px-4 py-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={`font-medium ${styles.label}`}
              >
                {notice.title}
              </p>

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
              className={`mt-2 text-sm leading-6 ${styles.description}`}
            >
              {notice.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

export function OrganizationSyncDryRun({
  dryRun,
}: OrganizationSyncDryRunProps) {
  const decisionStyles =
    DECISION_STYLES[
      dryRun.decision.tone
    ]

  return (
    <DashboardSection
      title="Prévia da execução"
      description={`Simulação gerada em ${dryRun.generatedAtLabel}. Nenhuma informação foi alterada.`}
    >
      <div className="space-y-4">
        <div
          className={`rounded-xl border p-5 ${decisionStyles.containerClassName}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">
                {dryRun.decision.title}
              </h3>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                {dryRun.decision.description}
              </p>
            </div>

            <Badge
              className={
                decisionStyles.badgeClassName
              }
            >
              {dryRun.decision.status ===
              "safe"
                ? "Seguro"
                : dryRun.decision.status ===
                    "review"
                  ? "Revisar"
                  : "Bloqueado"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dryRun.metrics.map((metric) => (
            <StatCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>

        <NoticeList
          title="Avisos para revisão"
          notices={dryRun.warnings}
          tone="warning"
        />

        <NoticeList
          title="Bloqueios encontrados"
          notices={dryRun.blockers}
          tone="danger"
        />

        {dryRun.warnings.length === 0 &&
        dryRun.blockers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
            Nenhum aviso ou bloqueio foi encontrado
            durante a simulação.
          </div>
        ) : null}
      </div>
    </DashboardSection>
  )
}
