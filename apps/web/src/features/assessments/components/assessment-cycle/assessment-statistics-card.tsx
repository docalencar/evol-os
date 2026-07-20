import { StatCard } from "@/components/dashboard/stat-card"

import type {
  AssessmentStatisticsViewModel,
} from "../../presenters/present-assessment-statistics"

type Props = {
  statistics: AssessmentStatisticsViewModel
}

export function AssessmentStatisticsCard({
  statistics,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {statistics.cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          description={card.description}
        />
      ))}
    </div>
  )
}
