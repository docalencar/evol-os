import { DataTable } from "@/components/shared/data-table"

import type { SeniorityLevel } from "../types/seniority-level"
import { ArchiveSeniorityLevelButton } from "./archive-seniority-level-button"
import { SeniorityLevelEditDialog } from "./seniority-level-edit-dialog"

type SeniorityLevelTableProps = {
  companyId: string
  seniorityLevels: SeniorityLevel[]
}

export function SeniorityLevelTable({
  companyId,
  seniorityLevels,
}: SeniorityLevelTableProps) {
  return (
    <DataTable
      title="Senioridades"
      data={seniorityLevels}
      rowKey={(seniorityLevel) => seniorityLevel.id}
      emptyMessage="Nenhuma senioridade cadastrada."
      columns={[
        {
          key: "code",
          header: "Código",
          render: (seniorityLevel) => (
            <span className="font-medium text-slate-900">
              {seniorityLevel.code}
            </span>
          ),
        },
        {
          key: "label",
          header: "Senioridade",
          render: (seniorityLevel) => seniorityLevel.label,
        },
        {
          key: "rank",
          header: "Ordem",
          render: (seniorityLevel) => seniorityLevel.rank,
        },
        {
          key: "actions",
          header: "Ações",
          render: (seniorityLevel) => (
            <div className="flex items-center gap-2">
              <SeniorityLevelEditDialog
                companyId={companyId}
                seniorityLevel={seniorityLevel}
              />

              <ArchiveSeniorityLevelButton
                companyId={companyId}
                seniorityLevelId={seniorityLevel.id}
              />
            </div>
          ),
        },
      ]}
    />
  )
}
