import {
  ChartNoAxesCombined,
} from "lucide-react"

import {
  DashboardCard,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard"

import type {
  DevelopmentMonthlyEvolution,
} from "../types/development-monthly-evolution"

type DevelopmentMonthlyEvolutionCardProps = {
  evolution: DevelopmentMonthlyEvolution
}

function formatCreatedPlans(
  count: number
) {
  return `${count} ${
    count === 1 ? "criado" : "criados"
  }`
}

function formatCompletedPlans(
  count: number
) {
  return `${count} ${
    count === 1
      ? "concluído"
      : "concluídos"
  }`
}

export function DevelopmentMonthlyEvolutionCard({
  evolution,
}: DevelopmentMonthlyEvolutionCardProps) {
  const totalActivity = evolution.reduce(
    (total, item) =>
      total +
      item.createdPlans +
      item.completedPlans,
    0
  )

  const maxValue = Math.max(
    ...evolution.flatMap((item) => [
      item.createdPlans,
      item.completedPlans,
    ]),
    0
  )

  return (
    <DashboardSection
      title="Evolução mensal"
      description="PDIs criados e concluídos nos últimos seis meses."
    >
      <DashboardCard>
        {totalActivity === 0 ? (
          <DashboardEmptyState
            title="Nenhuma movimentação recente"
            description="A evolução será exibida quando houver PDIs criados ou concluídos."
            icon={
              <ChartNoAxesCombined
                size={20}
              />
            }
          />
        ) : (
          <div className="space-y-6">
            {evolution.map((item) => (
              <div
                key={item.month}
                className="space-y-3"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-slate-900">
                    {item.label}
                  </span>

                  <span className="text-sm text-slate-500">
                    {formatCreatedPlans(
                      item.createdPlans
                    )}
                    {" · "}
                    {formatCompletedPlans(
                      item.completedPlans
                    )}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Criados</span>

                      <span>
                        {item.createdPlans}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-[width]"
                        style={{
                          width:
                            maxValue === 0
                              ? "0%"
                              : `${
                                  (item.createdPlans /
                                    maxValue) *
                                  100
                                }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Concluídos</span>

                      <span>
                        {item.completedPlans}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-[width]"
                        style={{
                          width:
                            maxValue === 0
                              ? "0%"
                              : `${
                                  (item.completedPlans /
                                    maxValue) *
                                  100
                                }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </DashboardSection>
  )
}