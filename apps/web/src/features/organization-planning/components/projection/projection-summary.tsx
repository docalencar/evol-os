import type { LucideIcon } from "lucide-react"
import {
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  Network,
  UserRoundCheck,
  Users,
} from "lucide-react"

import type {
  ProjectedOrganization,
} from "../../projection"

type ProjectionSummaryProps = {
  organization: ProjectedOrganization
}

type SummaryItem = {
  label: string
  value: string | number
  description: string
  icon: LucideIcon
}

const currencyFormatter = new Intl.NumberFormat(
  "pt-BR",
  {
    style: "currency",
    currency: "BRL",
  }
)

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: SummaryItem) {
  return (
    <article className="rounded-xl border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 truncate text-xl font-semibold tracking-tight">
            {value}
          </p>
        </div>

        <div className="shrink-0 rounded-lg border bg-background p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </article>
  )
}

export function ProjectionSummary({
  organization,
}: ProjectionSummaryProps) {
  const {
    metrics,
    teams,
  } = organization

  const items: SummaryItem[] = [
    {
      label: "Departamentos",
      value: metrics.departments,
      description: "Departamentos ativos na projeção.",
      icon: Building2,
    },
    {
      label: "Equipes",
      value: teams.filter(
        (team) => team.status === "active"
      ).length,
      description: "Equipes ativas na estrutura projetada.",
      icon: Network,
    },
    {
      label: "Cargos",
      value: metrics.positions,
      description: "Cargos ativos após as alterações.",
      icon: BriefcaseBusiness,
    },
    {
      label: "Colaboradores",
      value: metrics.headcount,
      description: "Headcount considerado na projeção.",
      icon: Users,
    },
    {
      label: "Vagas",
      value: metrics.vacancies,
      description: "Vagas previstas na nova estrutura.",
      icon: UserRoundCheck,
    },
    {
      label: "Massa salarial",
      value: currencyFormatter.format(
        metrics.salaryMass
      ),
      description: "Massa salarial calculada pelo cenário.",
      icon: CircleDollarSign,
    },
  ]

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div>
        <h3 className="font-semibold">
          Estrutura projetada
        </h3>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Indicadores calculados pelo Projection Engine para
          este cenário.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {items.map((item) => (
          <SummaryCard
            key={item.label}
            {...item}
          />
        ))}
      </div>
    </section>
  )
}
