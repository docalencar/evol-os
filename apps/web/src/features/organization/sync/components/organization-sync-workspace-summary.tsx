import {
  DashboardSection,
} from "@/components/dashboard/dashboard-section"
import {
  StatCard,
} from "@/components/dashboard/stat-card"

import type {
  OrganizationSyncWorkspaceViewModel,
} from "../view-models/organization-sync-workspace-view-model"

type OrganizationSyncWorkspaceSummaryProps = {
  workspace: OrganizationSyncWorkspaceViewModel
}

export function OrganizationSyncWorkspaceSummary({
  workspace,
}: OrganizationSyncWorkspaceSummaryProps) {
  return (
    <DashboardSection
      title="Plano de sincronização"
      description={`Gerado em ${workspace.generatedAtLabel}. Revise o impacto antes de aplicar.`}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {workspace.metrics.map((metric) => (
            <StatCard
              key={metric.id}
              label={metric.label}
              value={metric.value}
              description={metric.description}
            />
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {workspace.totalChanges === 0
            ? "Nenhuma mudança foi detectada."
            : workspace.requiresReview
              ? `${workspace.totalChanges} mudança${
                  workspace.totalChanges === 1 ? "" : "s"
                } detectada${
                  workspace.totalChanges === 1 ? "" : "s"
                }. Existem itens que exigem revisão.`
              : `${workspace.totalChanges} mudança${
                  workspace.totalChanges === 1 ? "" : "s"
                } pronta${
                  workspace.totalChanges === 1 ? "" : "s"
                } para revisão e confirmação.`}
        </div>
      </div>
    </DashboardSection>
  )
}
