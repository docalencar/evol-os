import {
  BriefcaseBusiness,
  CircleGauge,
  Clock3,
  Users,
} from "lucide-react"

import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state"
import { StatCard } from "@/components/dashboard/stat-card"

import type {
  PeopleAnalyticsDashboardViewModel,
} from "../types/people-analytics-dashboard"

type PeopleAnalyticsDashboardProps = {
  dashboard: PeopleAnalyticsDashboardViewModel
}

export function PeopleAnalyticsDashboardWidget({
  dashboard,
}: PeopleAnalyticsDashboardProps) {
  const occupancy = dashboard.organizationOccupancy

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Headcount atual"
          value={dashboard.headcount}
          description="Colaboradores ativos"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Vagas abertas"
          value={dashboard.openJobs}
          description="Vagas efetivamente abertas"
          icon={<BriefcaseBusiness className="h-5 w-5" />}
        />
        <StatCard
          label="Aguardando aprovação"
          value={dashboard.pendingApprovals}
          description="Solicitações pendentes no Approval"
          icon={<Clock3 className="h-5 w-5" />}
        />
        <StatCard
          label="Ocupação da estrutura"
          value={occupancy.percentage}
          description="Quadro das vagas abertas"
          icon={<CircleGauge className="h-5 w-5" />}
        />
      </div>

      <DashboardCard
        title="Estrutura ideal versus atual"
        description="Consolidação dos quadros informados nas vagas abertas."
      >
        {occupancy.isAvailable ? (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OccupancyItem label="Atual" value={occupancy.current} />
            <OccupancyItem label="Ideal" value={occupancy.ideal} />
            <OccupancyItem label="Diferença" value={occupancy.difference} />
            <OccupancyItem label="Ocupação" value={occupancy.percentage} />
          </dl>
        ) : (
          <DashboardEmptyState
            title="Estrutura ideal indisponível"
            description="Cadastre o quadro ideal em uma vaga aberta para calcular a ocupação."
          />
        )}
      </DashboardCard>

      {dashboard.isEmpty ? (
        <DashboardEmptyState
          title="Nenhum dado disponível para análise"
          description="Os indicadores serão preenchidos conforme pessoas, vagas e aprovações forem registradas."
        />
      ) : null}
    </div>
  )
}

function OccupancyItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  )
}
