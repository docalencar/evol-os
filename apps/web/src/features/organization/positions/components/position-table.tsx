import { DataTable } from "@/components/shared/data-table"

import { ArchivePositionButton } from "./archive-position-button"
import { PositionEditDialog } from "./position-edit-dialog"

type PositionTableItem = {
  id: string
  company_id: string
  name: string
  description: string | null
}
type PositionCompetencyTableItem = {
  id: string
  position_id: string
}

type PositionTableProps = {
  positions: PositionTableItem[]
  positionCompetencies?: PositionCompetencyTableItem[]
}

export function PositionTable({
  positions,
  positionCompetencies = [],
}: PositionTableProps) {
  return (
    <DataTable
      title="Cargos"
      data={positions}
      rowKey={(position) => position.id}
      emptyMessage="Nenhum cargo cadastrado."
      columns={[
        {
          key: "name",
          header: "Nome",
          render: (position) => (
            <span className="font-medium text-slate-900">
              {position.name}
            </span>
          ),
        },
        {
          key: "description",
          header: "Descrição",
          render: (position) => position.description || "Sem descrição",
        },
        {
          key: "actions",
          header: "Ações",
          render: (position) => (
            <div className="flex items-center gap-2">
              <PositionEditDialog
                companyId={position.company_id}
                position={position}
              />

              <ArchivePositionButton
                companyId={position.company_id}
                positionId={position.id}
              />
            </div>
          ),
        },
      ]}
    />
  )
}
