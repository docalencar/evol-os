import {
  AlertTriangle,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Building2,
  CheckCircle2,
  Circle,
  Lightbulb,
  Users,
} from "lucide-react"

import type { PlanningKpiCardViewModel } from "../../presentation"

type PlanningPresentationIcon = PlanningKpiCardViewModel["icon"]

const icons = {
  "alert-triangle": AlertTriangle,
  "arrow-down": ArrowDown,
  "arrow-right-left": ArrowRightLeft,
  "arrow-up": ArrowUp,
  building: Building2,
  "check-circle": CheckCircle2,
  circle: Circle,
  lightbulb: Lightbulb,
  users: Users,
} satisfies Record<PlanningPresentationIcon, typeof Circle>

type PlanningDashboardIconProps = {
  icon: PlanningPresentationIcon
  className?: string
}

export function PlanningDashboardIcon({
  icon,
  className,
}: PlanningDashboardIconProps) {
  const Icon = icons[icon]

  return <Icon aria-hidden="true" className={className} />
}
