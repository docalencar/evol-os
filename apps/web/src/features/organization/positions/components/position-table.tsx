import Link from "next/link"

import { DataTable } from "@/components/shared/data-table"

import type {
  PositionHierarchicalLevel,
  PositionStatus,
} from "../types/position"
import { ArchivePositionButton } from "./archive-position-button"
import { PositionEditDialog } from "./position-edit-dialog"

type DepartmentOption = {
  id: string
  name: string
}

type PositionTableItem = {
  id: string
  company_id: string
  name: string
  description: string | null
  department_id: string | null
  hierarchical_level: PositionHierarchicalLevel
  status: PositionStatus
}

type PositionCompetencyTableItem = {
  id: string
  position_id: string
}

type PositionTableProps = {
  positions: PositionTableItem[]
  departments: DepartmentOption[]
  positionCompetencies?: PositionCompetencyTableItem[]
}

export function PositionTable({
  positions,
  departments,
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
            <Link
              href={`/app/company/positions/${position.id}`}
              className="font-medium text-slate-900 transition-colors hover:text-blue-600 hover:underline"
            >
              {position.name}
            </Link>
          ),
        },
        {
          key: "description",
          header: "Descrição",
          render: (position) =>
            position.description || "Sem descrição",
        },
        {
          key: "actions",
          header: "Ações",
          render: (position) => (
            <div className="flex items-center gap-2">
              <PositionEditDialog
                companyId={position.company_id}
                departments={departments}
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