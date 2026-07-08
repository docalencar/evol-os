import { DataTable } from "@/components/shared/data-table"

import { ArchiveTeamButton } from "./archive-team-button"
import { TeamEditDialog } from "./team-edit-dialog"

type TeamTableItem = {
  id: string
  company_id: string
  name: string
  description: string | null
}

type TeamTableProps = {
  teams: TeamTableItem[]
}

export function TeamTable({ teams }: TeamTableProps) {
  return (
    <DataTable
      title="Times"
      data={teams}
      rowKey={(team) => team.id}
      emptyMessage="Nenhum time cadastrado."
      columns={[
        {
          key: "name",
          header: "Nome",
          render: (team) => (
            <span className="font-medium text-slate-900">
              {team.name}
            </span>
          ),
        },
        {
          key: "description",
          header: "Descrição",
          render: (team) => team.description || "Sem descrição",
        },
        {
          key: "actions",
          header: "Ações",
          render: (team) => (
            <div className="flex items-center gap-2">
              <TeamEditDialog
                companyId={team.company_id}
                team={team}
              />

              <ArchiveTeamButton
                companyId={team.company_id}
                teamId={team.id}
              />
            </div>
          ),
        },
      ]}
    />
  )
}
