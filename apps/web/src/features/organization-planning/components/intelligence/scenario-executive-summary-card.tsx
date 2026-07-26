import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react"

import type {
  ScenarioExecutiveSummary,
} from "../../intelligence"


type ScenarioExecutiveSummaryCardProps = {
  summary: ScenarioExecutiveSummary
}


function StatusIcon({
  status,
}: {
  status: ScenarioExecutiveSummary["status"]
}) {
  if (status === "healthy") {
    return (
      <CheckCircle2 className="h-5 w-5" />
    )
  }

  if (status === "critical") {
    return (
      <XCircle className="h-5 w-5" />
    )
  }

  return (
    <AlertTriangle className="h-5 w-5" />
  )
}


function StatusLabel(
  status: ScenarioExecutiveSummary["status"]
) {
  const labels = {
    healthy: "Cenário saudável",
    attention: "Requer atenção",
    critical: "Risco crítico",
  }

  return labels[status]
}


function RecommendationLabel(
  recommendation: ScenarioExecutiveSummary["recommendation"]
) {
  const labels = {
    approve: "Aprovar cenário",
    review: "Revisar cenário",
    reject: "Não recomendado",
  }

  return labels[recommendation]
}


export function ScenarioExecutiveSummaryCard({
  summary,
}: ScenarioExecutiveSummaryCardProps) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div className="rounded-xl border p-2">
          <StatusIcon
            status={summary.status}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            Resumo executivo
          </h2>

          <p className="text-sm text-muted-foreground">
            {StatusLabel(summary.status)}
          </p>
        </div>

      </div>


      <div className="rounded-xl border p-4">

        <p className="font-medium">
          {RecommendationLabel(
            summary.recommendation
          )}
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          {summary.summary}
        </p>

      </div>


      <div className="grid gap-3 sm:grid-cols-2">

        <div className="rounded-xl border p-3">
          <p className="text-sm text-muted-foreground">
            Alterações
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {summary.totalChanges}
          </p>
        </div>


        <div className="rounded-xl border p-3">
          <p className="text-sm text-muted-foreground">
            Riscos críticos
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {summary.criticalRisks}
          </p>
        </div>


        <div className="rounded-xl border p-3">
          <p className="text-sm text-muted-foreground">
            Liderança
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {summary.leadershipWarnings}
          </p>
        </div>


        <div className="rounded-xl border p-3">
          <p className="text-sm text-muted-foreground">
            Capacidade
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {summary.capacityWarnings}
          </p>
        </div>

      </div>

    </section>
  )
}
