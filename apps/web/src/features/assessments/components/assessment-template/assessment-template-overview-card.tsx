import { InfoCard } from "@/components/dashboard"

import type { AssessmentTemplate } from "../../types/assessment-template"

type AssessmentTemplateOverviewCardProps = {
  templates: AssessmentTemplate[]
}

export function AssessmentTemplateOverviewCard({
  templates,
}: AssessmentTemplateOverviewCardProps) {
  const activeTemplates = templates.filter(
    (template) => template.status === "active"
  ).length

  const draftTemplates = templates.filter(
    (template) => template.status === "draft"
  ).length

  const annualTemplates = templates.filter(
    (template) => template.type === "annual"
  ).length

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <InfoCard
        label="Total de templates"
        value={templates.length}
      />

      <InfoCard label="Templates ativos" value={activeTemplates} />

      <InfoCard label="Rascunhos" value={draftTemplates} />

      <InfoCard label="Templates anuais" value={annualTemplates} />
    </div>
  )
}
