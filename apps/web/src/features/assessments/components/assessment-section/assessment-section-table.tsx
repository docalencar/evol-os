import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"

import type { AssessmentSection } from "../../types/assessment-section"
import { ArchiveAssessmentSectionButton } from "./archive-assessment-section-button"
import { AssessmentSectionEditDialog } from "./assessment-section-edit-dialog"

type AssessmentSectionTableProps = {
  companyId: string
  sections: AssessmentSection[]
}

function getColorClassName(color: string | null) {
  switch (color) {
    case "emerald":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"

    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700"

    case "violet":
      return "border-violet-200 bg-violet-50 text-violet-700"

    case "rose":
      return "border-rose-200 bg-rose-50 text-rose-700"

    case "slate":
      return "border-slate-200 bg-slate-50 text-slate-700"

    case "blue":
    default:
      return "border-blue-200 bg-blue-50 text-blue-700"
  }
}

export function AssessmentSectionTable({
  companyId,
  sections,
}: AssessmentSectionTableProps) {
  return (
    <DataTable
      title="Seções do template"
      data={sections}
      rowKey={(section) => section.id}
      emptyMessage="Nenhuma seção cadastrada neste template."
      columns={[
        {
          key: "order",
          header: "Ordem",
          render: (section) => section.display_order,
        },
        {
          key: "name",
          header: "Seção",
          render: (section) => (
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">
                  {section.name}
                </span>

                {section.code ? (
                  <Badge className={getColorClassName(section.color)}>
                    {section.code}
                  </Badge>
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground">
                {section.description || "Sem descrição"}
              </p>
            </div>
          ),
        },
        {
          key: "weight",
          header: "Peso",
          render: (section) =>
            Number(section.weight).toLocaleString("pt-BR", {
              maximumFractionDigits: 2,
            }),
        },
        {
          key: "status",
          header: "Status",
          render: (section) => (
            <Badge
              className={
                section.active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }
            >
              {section.active ? "Ativa" : "Inativa"}
            </Badge>
          ),
        },
        {
          key: "actions",
          header: "Ações",
          render: (section) => (
            <div className="flex items-center gap-2">
              <AssessmentSectionEditDialog
                companyId={companyId}
                section={section}
              />

              <ArchiveAssessmentSectionButton
                companyId={companyId}
                assessmentSectionId={section.id}
              />
            </div>
          ),
        },
      ]}
    />
  )
}
