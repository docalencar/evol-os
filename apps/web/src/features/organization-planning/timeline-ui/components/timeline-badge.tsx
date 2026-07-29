import { Badge } from "@/components/ui/badge"

import type {
  PlanningTimelineBadgeViewModel,
  PlanningTimelineColor,
} from "../../timeline"

const badgeColors = {
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  red: "border-red-200 bg-red-50 text-red-800",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
} satisfies Record<PlanningTimelineColor, string>

type TimelineBadgeProps = {
  badge: PlanningTimelineBadgeViewModel
}

export function TimelineBadge({ badge }: TimelineBadgeProps) {
  return (
    <Badge className={`border ${badgeColors[badge.color]}`}>
      {badge.label}
    </Badge>
  )
}
