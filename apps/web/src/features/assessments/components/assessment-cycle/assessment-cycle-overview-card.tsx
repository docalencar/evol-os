import { InfoCard } from "@/components/dashboard"

import type { AssessmentCycle } from "../../types/assessment-cycle"

type AssessmentCycleOverviewCardProps = {
  cycles: AssessmentCycle[]
}

export function AssessmentCycleOverviewCard({
  cycles,
}: AssessmentCycleOverviewCardProps) {
  const activeCycles = cycles.filter(
    (cycle) => cycle.status === "active"
  ).length

  const scheduledCycles = cycles.filter(
    (cycle) => cycle.status === "scheduled"
  ).length

  const completedCycles = cycles.filter(
    (cycle) => cycle.status === "completed"
  ).length

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <InfoCard label="Total de ciclos" value={cycles.length} />

      <InfoCard label="Em andamento" value={activeCycles} />

      <InfoCard label="Agendados" value={scheduledCycles} />

      <InfoCard label="Concluídos" value={completedCycles} />
    </div>
  )
}
