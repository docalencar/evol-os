import Link from "next/link"

import {
  DashboardCard,
  DashboardSection,
  InfoCard,
  StatCard,
} from "@/components/dashboard"

import type {
  TeamWorkspaceViewModel,
} from "../view-models/team-workspace-view-model"

type TeamWorkspaceOverviewProps = {
  workspace: TeamWorkspaceViewModel
}

type ManagementCardProps = {
  title: string
  description: string
  href: string
}

function ManagementCard({
  title,
  description,
  href,
}: ManagementCardProps) {
  return (
    <DashboardCard>
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">
            {title}
          </h3>

          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        <Link
          href={href}
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Gerenciar
        </Link>
      </div>
    </DashboardCard>
  )
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
        title="Contexto organizacional"
        description="Posição atual do time dentro da estrutura da empresa."
      >
        <DashboardCard>
          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard
              label="Departamento"
              value={
                workspace.context
                  .departmentLabel
              }
            />

            <InfoCard
              label="Time superior"
              value={
                workspace.context
                  .parentTeamLabel
              }
            />
          </div>
        </DashboardCard>
      </DashboardSection>

      <DashboardSection
        title="Gerenciar"
        description="Acesse as áreas relacionadas à operação e à estrutura deste time."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ManagementCard
            title="Pessoas"
            description="Gerencie os colaboradores vinculados ao time e seus respectivos dados profissionais."
            href="/app/people"
          />

          <ManagementCard
            title="Cargos"
            description="Gerencie as funções e posições profissionais representadas dentro do time."
            href="/app/company/positions"
          />

          <ManagementCard
            title="Departamento"
            description="Acesse a estrutura departamental à qual este time está organizacionalmente vinculado."
            href="/app/company/departments"
          />

          <ManagementCard
            title="Times"
            description="Gerencie a hierarquia, os subtimes e os demais times existentes na organização."
            href="/app/company/teams"
          />
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
