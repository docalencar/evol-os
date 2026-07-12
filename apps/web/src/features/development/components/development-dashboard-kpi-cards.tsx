import {
  Ban,
  CheckCircle2,
  CirclePlay,
  Gauge,
} from "lucide-react"

import {
  StatCard,
} from "@/components/dashboard"

import type {
  DevelopmentDashboardKpis,
} from "../services/get-development-dashboard-kpis"

type DevelopmentDashboardKpiCardsProps = {
  kpis: DevelopmentDashboardKpis
}

export function DevelopmentDashboardKpiCards({
  kpis,
}: DevelopmentDashboardKpiCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="PDIs ativos"
        value={kpis.activePlans}
        description="Planos em andamento"
        icon={<CirclePlay size={20} />}
      />

      <StatCard
        label="PDIs concluídos"
        value={kpis.completedPlans}
        description="Planos finalizados"
        icon={<CheckCircle2 size={20} />}
      />

      <StatCard
        label="PDIs cancelados"
        value={kpis.cancelledPlans}
        description="Planos interrompidos"
        icon={<Ban size={20} />}
      />

      <StatCard
        label="Progresso médio"
        value={`${kpis.averageProgress}%`}
        description="Dos PDIs iniciados"
        icon={<Gauge size={20} />}
      />
    </div>
  )
}