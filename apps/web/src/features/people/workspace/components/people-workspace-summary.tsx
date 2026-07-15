import {
  DashboardSection,
} from "@/components/dashboard/dashboard-section"
import {
  StatCard,
} from "@/components/dashboard/stat-card"

import type {
  PeopleWorkspaceSummaryViewModel,
} from "../view-models/people-workspace-summary-view-model"

type PeopleWorkspaceSummaryProps = {
  summary: PeopleWorkspaceSummaryViewModel
}

export function PeopleWorkspaceSummary({
  summary,
}: PeopleWorkspaceSummaryProps) {
  const unavailableEmployees =
    summary.inactiveEmployees +
    summary.terminatedEmployees

  return (
    <DashboardSection
      title="Resumo da força de trabalho"
      description="Visão atual dos colaboradores cadastrados na empresa."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Colaboradores"
          value={summary.totalEmployees}
          description="Total cadastrado"
        />

        <StatCard
          label="Ativos"
          value={summary.activeEmployees}
          description="Em atividade"
        />

        <StatCard
          label="Afastados"
          value={summary.onLeaveEmployees}
          description="Temporariamente afastados"
        />

        <StatCard
          label="Inativos e desligados"
          value={unavailableEmployees}
          description={`${summary.inactiveEmployees} inativos · ${summary.terminatedEmployees} desligados`}
        />
      </div>
    </DashboardSection>
  )
}
