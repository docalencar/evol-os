import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  UsersRound,
} from "lucide-react"

import {
  DashboardCard,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard"

import type {
  DevelopmentPriority,
  DevelopmentPriorityRisk,
} from "@/features/talent"

type DevelopmentPrioritiesCardProps = {
  priorities: DevelopmentPriority[]
}

const DEVELOPMENT_PRIORITY_LABELS: Record<
  DevelopmentPriorityRisk,
  string
> = {
  high: "Alta prioridade",
  medium: "Média prioridade",
  low: "Baixa prioridade",
}

const DEVELOPMENT_PRIORITY_STYLES: Record<
  DevelopmentPriorityRisk,
  string
> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-emerald-50 text-emerald-700",
}

function getPriorityIcon(
  risk: DevelopmentPriorityRisk
) {
  switch (risk) {
    case "high":
      return <AlertTriangle size={16} />

    case "medium":
      return <AlertCircle size={16} />

    case "low":
      return <CheckCircle2 size={16} />
  }
}

function getPriorityDescription(
  priority: DevelopmentPriority
) {
  const details: string[] = []

  if (priority.criticalGaps > 0) {
    details.push(
      `${priority.criticalGaps} ${
        priority.criticalGaps === 1
          ? "GAP crítico"
          : "GAPs críticos"
      }`
    )
  }

  if (priority.attentionGaps > 0) {
    details.push(
      `${priority.attentionGaps} ${
        priority.attentionGaps === 1
          ? "GAP de atenção"
          : "GAPs de atenção"
      }`
    )
  }

  return details.length > 0
    ? details.join(" · ")
    : "Sem GAPs críticos ou de atenção"
}

export function DevelopmentPrioritiesCard({
  priorities,
}: DevelopmentPrioritiesCardProps) {
  const relevantPriorities =
    priorities
      .filter(
        (priority) =>
          priority.risk !== "low"
      )
      .slice(0, 5)

  return (
    <DashboardSection
      title="Prioridades de Desenvolvimento"
      description="Colaboradores que demandam maior atenção no desenvolvimento."
    >
      <DashboardCard>
        {relevantPriorities.length === 0 ? (
          <DashboardEmptyState
            title="Nenhuma prioridade identificada"
            description="Não há colaboradores com GAPs críticos ou de atenção no momento."
            icon={<UsersRound size={20} />}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {relevantPriorities.map(
              (priority) => (
                <div
                  key={priority.employeeId}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {priority.employeeName}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {getPriorityDescription(
                        priority
                      )}
                    </p>

                    {priority.biggestGap ? (
                      <p className="mt-1 text-sm text-slate-500">
                        Maior GAP:{" "}
                        <span className="font-medium text-slate-700">
                          {
                            priority.biggestGap
                          }
                        </span>
                      </p>
                    ) : null}
                  </div>

                  <div
                    className={`flex w-fit shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                      DEVELOPMENT_PRIORITY_STYLES[
                        priority.risk
                      ]
                    }`}
                  >
                    {getPriorityIcon(
                      priority.risk
                    )}

                    {
                      DEVELOPMENT_PRIORITY_LABELS[
                        priority.risk
                      ]
                    }
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </DashboardCard>
    </DashboardSection>
  )
}