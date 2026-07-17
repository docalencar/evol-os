import type {
  TeamDetailsViewModel,
} from "../view-models/team-details-view-model"

type TeamDetailsPresenterInput = {
  id: string
  company_id: string

  name: string
  description: string | null

  parent_team_id: string | null
  manager_id: string | null

  created_at: string
  updated_at: string
  deleted_at?: string | null
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date))
}

export function presentTeamDetails(
  team: TeamDetailsPresenterInput
): TeamDetailsViewModel {
  return {
    id: team.id,
    companyId: team.company_id,

    name: team.name,
    description:
      team.description ??
      "Time sem descrição cadastrada.",

    parentTeamId: team.parent_team_id,
    parentTeamStatusLabel:
      team.parent_team_id
        ? "Vinculado a outro time"
        : "Sem time superior",

    leaderId: team.manager_id,
    leadershipStatusLabel:
      team.manager_id
        ? "Líder vinculado"
        : "Sem líder definido",

    statusLabel:
      team.deleted_at
        ? "Arquivado"
        : "Ativo",

    createdAtLabel: formatDate(
      team.created_at
    ),

    updatedAtLabel: formatDate(
      team.updated_at
    ),
  }
}
