import {
  ChartBarBig,
} from "lucide-react"

import {
  DashboardCard,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard"

import type {
  DevelopmentPlanDistribution,
} from "../types/development-plan-distribution"

type DevelopmentPlanDistributionCardProps = {
  distribution: DevelopmentPlanDistribution
}

const STATUS_BAR_STYLES = {
  draft: "bg-slate-400",
  active: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
} as const

export function DevelopmentPlanDistributionCard({
  distribution,
}: DevelopmentPlanDistributionCardProps) {
  const totalPlans = distribution.reduce(
    (total, item) =>
      total + item.count,
    0
  )

  const maxCount = Math.max(
    ...distribution.map(
      (item) => item.count
    ),
    0
  )

  return (
    <DashboardSection
      title="Distribuição dos PDIs"
      description="Distribuição dos planos por status."
    >
      <DashboardCard>
        {totalPlans === 0 ? (
          <DashboardEmptyState
            title="Nenhum PDI cadastrado"
            description="A distribuição será exibida após a criação dos primeiros planos."
            icon={<ChartBarBig size={20} />}
          />
        ) : (
          <div className="space-y-5">
            {distribution.map((item) => {
              const relativeWidth =
                maxCount === 0
                  ? 0
                  : Math.round(
                      (item.count / maxCount) *
                        100
                    )

              return (
                <div
                  key={item.status}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {item.label}
                      </p>

                      <p className="text-sm text-slate-500">
                        {item.percentage}% do total
                      </p>
                    </div>

                    <span className="shrink-0 text-sm font-semibold text-slate-700">
                      {item.count}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-[width] ${
                        STATUS_BAR_STYLES[
                          item.status
                        ]
                      }`}
                      style={{
                        width: `${relativeWidth}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DashboardCard>
    </DashboardSection>
  )
}