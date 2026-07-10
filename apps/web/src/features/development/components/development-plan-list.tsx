import { DashboardCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"

import {
  DEVELOPMENT_PLAN_PRIORITY_LABELS,
  DEVELOPMENT_PLAN_STATUS_LABELS,
  type DevelopmentPlanPriority,
  type DevelopmentPlanStatus,
} from "../constants/development-plan"

type DevelopmentPlanListItem = {
  id: string
  title: string
  description: string | null
  status: DevelopmentPlanStatus
  priority: DevelopmentPlanPriority
  due_date: string | null
}

type DevelopmentPlanListProps = {
  plans: DevelopmentPlanListItem[]
}

function formatDate(date: string | null) {
  if (!date) {
    return "Sem prazo"
  }

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${date}T00:00:00`)
  )
}

export function DevelopmentPlanList({
  plans,
}: DevelopmentPlanListProps) {
  if (plans.length === 0) {
    return (
      <DashboardCard>
        <div className="py-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Nenhum plano de desenvolvimento cadastrado
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Os planos de desenvolvimento ajudam a transformar gaps de
            competências em objetivos e ações práticas.
          </p>
        </div>
      </DashboardCard>
    )
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <DashboardCard key={plan.id}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="break-words text-lg font-semibold text-slate-900">
                {plan.title}
              </h2>

              {plan.description ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {plan.description}
                </p>
              ) : null}

              <p className="mt-3 text-sm text-slate-500">
                Prazo: {formatDate(plan.due_date)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>
                {DEVELOPMENT_PLAN_STATUS_LABELS[plan.status]}
              </Badge>

              <Badge>
                Prioridade{" "}
                {DEVELOPMENT_PLAN_PRIORITY_LABELS[
                  plan.priority
                ].toLowerCase()}
              </Badge>
            </div>
          </div>
        </DashboardCard>
      ))}
    </div>
  )
}
