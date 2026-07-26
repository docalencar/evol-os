import {
  AlertTriangle,
  GitBranch,
  Layers3,
} from "lucide-react"

import type {
  PlanningScenarioPage,
} from "../queries/get-planning-scenario"

import {
  ChangeSetTimeline,
} from "./change-sets"

import {
  PlanningChangeDialog,
} from "./planning-change-dialog"

import {
  ProjectionErrorList,
  ProjectionOrganizationPreview,
  ProjectionSummary,
  ProjectionWarningList,
} from "./projection"


type PlanningScenarioWorkspaceProps = {
  planning: PlanningScenarioPage
}


function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string | number
  description: string
  icon: typeof Layers3
}) {
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {value}
          </p>
        </div>

        <div className="rounded-xl border bg-muted/40 p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {description}
      </p>
    </article>
  )
}


export function PlanningScenarioWorkspace({
  planning,
}: PlanningScenarioWorkspaceProps) {
  const {
    scenario,
    metrics,
    changeSets,
    projection,
  } = planning


  return (
    <div className="space-y-6">

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <MetricCard
          title="Alterações"
          value={metrics.totalChanges}
          description="Mudanças incluídas no cenário."
          icon={GitBranch}
        />

        <MetricCard
          title="Pendências"
          value={metrics.pendingChanges}
          description="Alterações que ainda exigem revisão."
          icon={AlertTriangle}
        />

        <MetricCard
          title="Alertas"
          value={metrics.warnings}
          description="Riscos identificados pela projeção."
          icon={AlertTriangle}
        />

        <MetricCard
          title="Versão projetada"
          value={`v${metrics.projectedVersion}`}
          description="Versão atual da simulação."
          icon={Layers3}
        />

      </section>


      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">

          <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-lg font-semibold">
                Linha do tempo de alterações
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Acompanhe todas as mudanças planejadas
                neste cenário.
              </p>
            </div>


            <PlanningChangeDialog
              scenarioId={scenario.id}
              departments={
                projection.organization.departments
              }
              teams={
                projection.organization.teams
              }
              disabled={
                scenario.status !== "draft"
              }
            />

          </div>


          <ChangeSetTimeline
            changeSets={changeSets}
            scenarioId={scenario.id}
            departments={
              projection.organization.departments
            }
          />

        </div>


        <div className="space-y-5">

          <ProjectionSummary
            organization={
              projection.organization
            }
          />


          <ProjectionErrorList
            errors={projection.errors}
          />


          <ProjectionWarningList
            warnings={projection.warnings}
          />


          <ProjectionOrganizationPreview
            organization={
              projection.organization
            }
          />

        </div>

      </section>

    </div>
  )
}