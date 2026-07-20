import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Users,
} from "lucide-react"

import {
  StatCard,
} from "@/components/dashboard"

import type {
  EmployeeWorkspaceMetricViewModel,
} from "../view-models/employee-workspace-view-model"

type EmployeeProfileStatsProps = {
  metrics: EmployeeWorkspaceMetricViewModel[]
}

function getMetricIcon(
  metricId: EmployeeWorkspaceMetricViewModel["id"]
) {
  switch (metricId) {
    case "company-tenure":
      return <Building2 size={20} />

    case "position":
      return <BriefcaseBusiness size={20} />

    case "team":
      return <Users size={20} />

    case "hire-date":
      return <CalendarDays size={20} />
  }
}

export function EmployeeProfileStats({
  metrics,
}: EmployeeProfileStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <StatCard
          key={metric.id}
          label={metric.label}
          value={metric.value}
          description={
            metric.description
          }
          icon={
            getMetricIcon(
              metric.id
            )
          }
        />
      ))}
    </div>
  )
}
