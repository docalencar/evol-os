import Link from "next/link"

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

export function TeamTable({
  teams,
}: TeamTableProps) {
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
            <Link
              href={`/app/company/teams/${team.id}`}
              className="font-medium text-slate-900 transition-colors hover:text-slate-600 hover:underline"
            >
              {team.name}
            </Link>
          ),
        },
        {
          key: "description",
          header: "Descrição",
          render: (team) =>
            team.description ||
            "Sem descrição",
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
