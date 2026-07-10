import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"

import type { Competency } from "../types/competency"
import { ArchiveCompetencyButton } from "./archive-competency-button"
import { CompetencyEditDialog } from "./competency-edit-dialog"

type CompetencyTableProps = {
  companyId: string
  competencies: Competency[]
}

function getCategoryLabel(category: Competency["category"]) {
  switch (category) {
    case "behavioral":
      return "Comportamental"

    case "technical":
      return "Técnica"

    case "leadership":
      return "Liderança"

    default:
      return category
  }
}

export function CompetencyTable({
  companyId,
  competencies,
}: CompetencyTableProps) {
  return (
    <DataTable
      title="Competências"
      data={competencies}
      rowKey={(competency) => competency.id}
      emptyMessage="Nenhuma competência cadastrada."
      columns={[
        {
          key: "name",
          header: "Nome",
          render: (competency) => (
            <span className="font-medium text-slate-900">
              {competency.name}
            </span>
          ),
        },
        {
          key: "category",
          header: "Categoria",
          render: (competency) => (
            <Badge>{getCategoryLabel(competency.category)}</Badge>
          ),
        },
        {
          key: "expected_level",
          header: "Nível",
          render: (competency) => competency.expected_level,
        },
        {
          key: "weight",
          header: "Peso",
          render: (competency) => competency.weight,
        },
        {
          key: "actions",
          header: "Ações",
          render: (competency) => (
            <div className="flex items-center gap-2">
              <CompetencyEditDialog
                companyId={companyId}
                competency={competency}
              />

              <ArchiveCompetencyButton
                companyId={companyId}
                competencyId={competency.id}
              />
            </div>
          ),
        },
      ]}
    />
  )
}
