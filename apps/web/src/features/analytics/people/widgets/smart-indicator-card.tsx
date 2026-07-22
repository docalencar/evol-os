import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Minus,
} from "lucide-react"

import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/utils/cn"

import type {
  SmartIndicatorStatus,
  SmartIndicatorTrend,
  SmartIndicatorViewModel,
} from "../types/smart-indicator"

const statusStyles: Record<
  SmartIndicatorStatus,
  string
> = {
  healthy: "bg-slate-100 text-slate-700",
  warning: "bg-amber-100 text-amber-800",
  critical: "bg-red-100 text-red-800",
  unavailable: "bg-slate-100 text-slate-600",
}

const trendLabels: Record<SmartIndicatorTrend, string> = {
  up: "Aumento",
  down: "Redução",
  stable: "Estável",
  unavailable: "Sem comparação",
}

type SmartIndicatorCardProps = {
  indicator: SmartIndicatorViewModel
}

export function SmartIndicatorCard({
  indicator,
}: SmartIndicatorCardProps) {
  return (
    <DashboardCard className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">
          {indicator.title}
        </p>
        <Badge
          className={statusStyles[indicator.status]}
        >
          {indicator.statusLabel}
        </Badge>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">
        {indicator.formattedValue}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {indicator.description}
      </p>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
        <TrendIcon trend={indicator.trend} />
        <span>
          {indicator.formattedVariation ??
            "Sem comparação disponível"}
        </span>
        <span className="text-slate-400">
          {indicator.comparisonLabel}
        </span>
      </div>

      <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700">
        {indicator.insight}
      </p>
    </DashboardCard>
  )
}

function TrendIcon({
  trend,
}: {
  trend: SmartIndicatorTrend
}) {
  const commonProps = {
    className: cn(
      "h-4 w-4 shrink-0",
      trend === "up" && "text-amber-600",
      trend === "down" && "text-emerald-600",
      (trend === "stable" || trend === "unavailable") &&
        "text-slate-500"
    ),
    "aria-label": trendLabels[trend],
  }

  if (trend === "up") return <ArrowUp {...commonProps} />
  if (trend === "down") return <ArrowDown {...commonProps} />
  if (trend === "stable") {
    return <ArrowRight {...commonProps} />
  }
  return <Minus {...commonProps} />
}
