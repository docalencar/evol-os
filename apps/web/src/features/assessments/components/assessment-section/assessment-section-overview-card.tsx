import { InfoCard } from "@/components/dashboard"

import type { AssessmentSection } from "../../types/assessment-section"

type AssessmentSectionOverviewCardProps = {
  sections: AssessmentSection[]
}

export function AssessmentSectionOverviewCard({
  sections,
}: AssessmentSectionOverviewCardProps) {
  const activeSections = sections.filter(
    (section) => section.active
  ).length

  const totalWeight = sections.reduce(
    (total, section) => total + Number(section.weight),
    0
  )

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <InfoCard label="Total de seções" value={sections.length} />

      <InfoCard label="Seções ativas" value={activeSections} />

      <InfoCard
        label="Peso total"
        value={totalWeight.toLocaleString("pt-BR", {
          maximumFractionDigits: 2,
        })}
      />
    </div>
  )
}
