import {
  InfoCard,
} from "@/components/dashboard"

type PositionOverviewCardProps = {
  competencyCount: number

  employeeCount: number

  activeEmployees: number

  onLeaveEmployees: number
}

export function PositionOverviewCard({
  competencyCount,
  employeeCount,
  activeEmployees,
  onLeaveEmployees,
}: PositionOverviewCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <InfoCard
        label="Competências esperadas"
        value={competencyCount}
      />

      <InfoCard
        label="Colaboradores vinculados"
        value={employeeCount}
      />

      <InfoCard
        label="Colaboradores ativos"
        value={activeEmployees}
      />

      <InfoCard
        label="Em afastamento"
        value={onLeaveEmployees}
      />
    </div>
  )
}