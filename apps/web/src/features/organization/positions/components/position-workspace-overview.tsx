import Link from "next/link"

import {
  DashboardCard,
  DashboardSection,
  InfoCard,
  StatCard,
} from "@/components/dashboard"

import type {
  PositionWorkspaceViewModel,
} from "../view-models/position-workspace-view-model"

type PositionWorkspaceOverviewProps = {
  workspace: PositionWorkspaceViewModel
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

export function PositionWorkspaceOverview({
  workspace,
}: PositionWorkspaceOverviewProps) {
  return (
    <div className="space-y-8">
      <DashboardSection
        title="Indicadores do cargo"
        description="Visão rápida dos vínculos, requisitos e competências associados ao cargo."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
        description="Posição atual do cargo dentro da estrutura da empresa."
      >
        <DashboardCard>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoCard
              label="Departamento"
              value={
                workspace.context
                  .departmentLabel
              }
            />

            <InfoCard
              label="Nível hierárquico"
              value={
                workspace.context
                  .hierarchicalLevelLabel
              }
            />

            <InfoCard
              label="Status"
              value={
                workspace.context
                  .statusLabel
              }
            />
          </div>
        </DashboardCard>
      </DashboardSection>

      <DashboardSection
        title="Condições de trabalho"
        description="Informações contratuais e operacionais associadas ao cargo."
      >
        <DashboardCard>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              label="Carga horária"
              value={
                workspace.arrangement
                  .weeklyWorkloadLabel
              }
            />

            <InfoCard
              label="Modelo de trabalho"
              value={
                workspace.arrangement
                  .workModelLabel
              }
            />

            <InfoCard
              label="Tipo de vínculo"
              value={
                workspace.arrangement
                  .employmentTypeLabel
              }
            />

            <InfoCard
              label="Viagens"
              value={
                workspace.arrangement
                  .travelRequirementLabel
              }
            />
          </div>
        </DashboardCard>
      </DashboardSection>

      <DashboardSection
        title="Gerenciar"
        description="Acesse as áreas relacionadas à estrutura e aos vínculos deste cargo."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ManagementCard
            title="Pessoas"
            description="Gerencie os colaboradores vinculados a este cargo."
            href="/app/people"
          />

          <ManagementCard
            title="Competências"
            description="Gerencie as competências esperadas e seus respectivos níveis."
            href="/app/competencies"
          />

          <ManagementCard
            title="Departamentos"
            description="Gerencie a estrutura departamental à qual os cargos pertencem."
            href="/app/company/departments"
          />

          <ManagementCard
            title="Cargos"
            description="Acesse e gerencie os demais cargos da organização."
            href="/app/company/positions"
          />
        </div>
      </DashboardSection>

      <DashboardSection
        title="Colaboradores"
        description="Pessoas atualmente vinculadas a este cargo."
        actions={
          workspace.hasEmployees ? (
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
          {!workspace.hasEmployees ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-slate-900">
                Nenhum colaborador vinculado
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Os colaboradores associados a este cargo aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {workspace.visibleEmployees.map(
                (employee) => (
                  <Link
                    key={employee.id}
                    href={employee.profileHref}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {employee.name}
                      </p>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {employee.email}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm text-slate-700">
                      {employee.statusLabel}
                    </p>
                  </Link>
                )
              )}

              {workspace.remainingEmployees > 0 ? (
                <div className="pt-4 text-sm text-slate-500">
                  Mais{" "}
                  {workspace.remainingEmployees}{" "}
                  {workspace.remainingEmployees ===
                  1
                    ? "colaborador"
                    : "colaboradores"}{" "}
                  neste cargo.
                </div>
              ) : null}
            </div>
          )}
        </DashboardCard>
      </DashboardSection>
    </div>
  )
}
