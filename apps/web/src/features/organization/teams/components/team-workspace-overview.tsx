import Link from "next/link"

import {
  DashboardCard,
  DashboardSection,
  StatCard,
} from "@/components/dashboard"

import type {
  TeamWorkspaceViewModel,
} from "../view-models/team-workspace-view-model"

type TeamWorkspaceOverviewProps = {
  workspace: TeamWorkspaceViewModel
}

export function TeamWorkspaceOverview({
  workspace,
}: TeamWorkspaceOverviewProps) {
  return (
    <div className="space-y-8">
      <DashboardSection
        title="Indicadores do time"
        description="Visão rápida da composição e da estrutura atual do time."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {workspace.metrics.map(
            (metric) => (
              <StatCard
                key={metric.id}
                label={metric.label}
                value={metric.value}
                description={
                  metric.description
                }
              />
            )
          )}
        </div>
      </DashboardSection>

      <DashboardSection
        title="Colaboradores"
        description="Pessoas atualmente vinculadas a este time."
        actions={
          workspace.hasMembers ? (
            <Link
              href="/app/people"
              className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950 hover:underline"
            >
              Ver todos os colaboradores
            </Link>
          ) : null
        }
      >
        <DashboardCard>
          {!workspace.hasMembers ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-slate-900">
                Nenhum colaborador vinculado
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Os colaboradores associados a este time aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {workspace.visibleMembers.map(
                (member) => (
                  <Link
                    key={member.id}
                    href={member.profileHref}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {member.name}
                        </p>

                        {member.isLeader ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            Líder
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {member.email}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm text-slate-700">
                        {member.positionLabel}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {member.statusLabel}
                      </p>
                    </div>
                  </Link>
                )
              )}

              {workspace.remainingMembers > 0 ? (
                <div className="pt-4 text-sm text-slate-500">
                  Mais{" "}
                  {workspace.remainingMembers}{" "}
                  {workspace.remainingMembers ===
                  1
                    ? "colaborador"
                    : "colaboradores"}{" "}
                  neste time.
                </div>
              ) : null}
            </div>
          )}
        </DashboardCard>
      </DashboardSection>
    </div>
  )
}
