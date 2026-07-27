import {
  ArrowLeft,
  CalendarClock,
  GitBranch,
  Layers3,
  ListChecks,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"

import {
  getPlanningScenario,
  ScenarioExecutiveSummaryCard,
  ScenarioIntelligencePanel,
} from "@/features/organization-planning"

import type {
  PlanningScenarioStatus,
} from "@/features/organization-planning"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"


const STATUS_LABELS: Record<
  PlanningScenarioStatus,
  string
> = {
  draft: "Rascunho",
  submitted: "Em aprovação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  published: "Publicado",
  archived: "Arquivado",
}


function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  )
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
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {title}
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {value}
          </p>
        </div>

        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {description}
      </p>
    </article>
  )
}


function StatusBadge({
  status,
}: {
  status: PlanningScenarioStatus
}) {
  return (
    <span className="rounded-full border px-3 py-1 text-xs font-medium">
      {STATUS_LABELS[status]}
    </span>
  )
}


export default async function ScenarioPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const {
    id,
  } = await params


  const {
    companyId,
  } = await getCurrentCompanyContext()


  const scenario =
    await getPlanningScenario(
      companyId,
      id
    )


  if (!scenario) {
    notFound()
  }


  return (
    <div className="space-y-8">

      <Link
        href="/app/organization"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>


      <PageHeader
        title={scenario.scenario.name}
        description={
          scenario.scenario.description ??
          "Cenário de planejamento organizacional."
        }
      />


      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">

          <StatusBadge
            status={
              scenario.scenario.status
            }
          />

          <span className="text-sm text-muted-foreground">
            Versão {scenario.scenario.version}
          </span>

        </div>


        <p className="mt-4 text-sm text-muted-foreground">
          Atualizado em{" "}
          {formatDate(
            scenario.scenario.updatedAt
          )}
        </p>

      </section>


      <section className="grid gap-4 md:grid-cols-3">

        <MetricCard
          title="Alterações"
          value={
            scenario.metrics.totalChanges
          }
          description="Mudanças planejadas"
          icon={ListChecks}
        />


        <MetricCard
          title="Alertas"
          value={
            scenario.metrics.warnings
          }
          description="Pontos encontrados na projeção"
          icon={CalendarClock}
        />


        <MetricCard
          title="Projeção"
          value={
            scenario.metrics.projectedVersion
          }
          description="Versão projetada"
          icon={GitBranch}
        />

      </section>


      <ScenarioExecutiveSummaryCard
        summary={
          scenario.executiveSummary
        }
      />


      <ScenarioIntelligencePanel
        structuralImpact={
          scenario.structuralImpact
        }

        insights={
          scenario.insights
        }

        spanOfControl={
          scenario.spanOfControl
        }

        positionCapacity={
          scenario.positionCapacity
        }

        employees={
          scenario.projection.organization.employees
        }
      />


      <section className="rounded-2xl border bg-card">

        <div className="border-b p-5">
          <h2 className="font-semibold">
            Histórico de alterações
          </h2>
        </div>


        {
          scenario.changeSets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma alteração registrada.
            </div>
          ) : (

            <div className="divide-y">

              {
                scenario.changeSets.map(
                  (changeSet) => (
                    <div
                      key={changeSet.id}
                      className="flex justify-between p-5"
                    >

                      <div>
                        <p className="font-medium">
                          {changeSet.changeType}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Versão {changeSet.version}
                        </p>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {formatDate(
                          changeSet.updatedAt
                        )}
                      </p>

                    </div>
                  )
                )

              }

            </div>
          )
        }

      </section>

    </div>
  )
}
