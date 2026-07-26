import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

import type {
  CostImpactResult,
} from "../../intelligence"


type ScenarioFinancialImpactCardProps = {
  impact: CostImpactResult
}


function StatusIcon({
  status,
}: {
  status: CostImpactResult["status"]
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
  status: CostImpactResult["status"]
) {
  const labels = {
    healthy: "Impacto financeiro controlado",
    attention: "Requer análise financeira",
    critical: "Impacto financeiro crítico",
  }

  return labels[status]
}


function formatCurrency(
  value: number
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value)
}


export function ScenarioFinancialImpactCard({
  impact,
}: ScenarioFinancialImpactCardProps) {
  const positive =
    impact.monthlyVariation > 0


  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div className="rounded-xl border p-2">
          <StatusIcon
            status={impact.status}
          />
        </div>


        <div>
          <h2 className="text-lg font-semibold">
            Impacto financeiro
          </h2>

          <p className="text-sm text-muted-foreground">
            {StatusLabel(impact.status)}
          </p>
        </div>

      </div>


      <div className="rounded-xl border p-4">

        <p className="font-medium">
          Variação mensal projetada
        </p>


        <div className="mt-2 flex items-center gap-2">

          {positive ? (
            <TrendingUp className="h-5 w-5" />
          ) : (
            <TrendingDown className="h-5 w-5" />
          )}


          <p className="text-2xl font-semibold">
            {formatCurrency(
              impact.monthlyVariation
            )}
          </p>

        </div>

      </div>


      <div className="grid gap-3 sm:grid-cols-2">

        <div className="rounded-xl border p-3">
          <p className="text-sm text-muted-foreground">
            Custo atual mensal
          </p>

          <p className="mt-1 text-xl font-semibold">
            {formatCurrency(
              impact.currentMonthlyCost
            )}
          </p>
        </div>


        <div className="rounded-xl border p-3">
          <p className="text-sm text-muted-foreground">
            Custo projetado mensal
          </p>

          <p className="mt-1 text-xl font-semibold">
            {formatCurrency(
              impact.projectedMonthlyCost
            )}
          </p>
        </div>


        <div className="rounded-xl border p-3">
          <p className="text-sm text-muted-foreground">
            Contratações
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {impact.employeesAdded}
          </p>
        </div>


        <div className="rounded-xl border p-3">
          <p className="text-sm text-muted-foreground">
            Reduções
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {impact.employeesRemoved}
          </p>
        </div>

      </div>

    </section>
  )
}
