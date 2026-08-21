import {
  DashboardSection,
} from "@/components/dashboard/dashboard-section"

import type {
  OrganizationSyncWorkspaceViewModel,
} from "../view-models/organization-sync-workspace-view-model"

type OrganizationSyncWorkspaceSummaryProps = {
  workspace: OrganizationSyncWorkspaceViewModel
}

export function OrganizationSyncWorkspaceSummary({
  workspace,
}: OrganizationSyncWorkspaceSummaryProps) {
  // No-change: nothing to apply. The header must not invite an apply action,
  // and "already recognized" is the whole story — not a partial footnote.
  if (workspace.noChange) {
    return (
      <DashboardSection
        title="Plano de sincronização"
        description={`Gerado em ${workspace.generatedAtLabel}.`}
      >
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Nenhuma alteração necessária. Os colaboradores e estruturas
          desta planilha já estão sincronizados com a organização atual.
        </div>
      </DashboardSection>
    )
  }

  return (
    <DashboardSection
      title="Plano de sincronização"
      description={`Gerado em ${workspace.generatedAtLabel}. Revise o impacto antes de aplicar.`}
    >
      <div className="space-y-4">
        {workspace.plannedChanges.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">
              O que será aplicado
            </p>

            <ul className="mt-2 space-y-1">
              {workspace.plannedChanges.map((change) => (
                <li
                  key={change}
                  className="text-sm leading-6 text-slate-600"
                >
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {workspace.alreadyRecognizedMessage ? (
          <p className="text-sm leading-6 text-slate-500">
            {workspace.alreadyRecognizedMessage}
          </p>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {workspace.plannedChanges.length === 0
            ? "Nenhuma mudança será aplicada."
            : workspace.requiresReview
              ? "Existem itens que exigem revisão antes de aplicar."
              : "Revise as mudanças acima e confirme para aplicar."}
        </div>
      </div>
    </DashboardSection>
  )
}
