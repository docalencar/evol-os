import type {
  TeamWorkspaceMemberViewModel,
  TeamWorkspaceViewModel,
} from "../view-models/team-workspace-view-model"

type TeamWorkspaceEmployeeInput = {
  id: string
  full_name: string
  email: string | null
  status:
    | "active"
    | "inactive"
    | "on_leave"
    | "terminated"
  team_id: string | null
  position_id: string | null
}

type PresentTeamWorkspaceInput = {
  teamId: string
  leaderId: string | null
  childTeamsCount: number
  departmentName: string | null
  parentTeamName: string | null
  employees: TeamWorkspaceEmployeeInput[]
  visibleMembersLimit?: number
}

const STATUS_LABELS: Record<
  TeamWorkspaceEmployeeInput["status"],
  string
> = {
  active: "Ativo",
  inactive: "Inativo",
  on_leave: "Afastado",
  terminated: "Desligado",
}

function presentMember(
  employee: TeamWorkspaceEmployeeInput,
  leaderId: string | null
): TeamWorkspaceMemberViewModel {
  return {
    id: employee.id,
    name: employee.full_name,
    email:
      employee.email ??
      "E-mail não informado",
    statusLabel:
      STATUS_LABELS[employee.status],
    positionLabel:
      employee.position_id
        ? "Cargo vinculado"
        : "Sem cargo definido",
    profileHref:
      `/app/people/${employee.id}`,
    isLeader:
      employee.id === leaderId,
  }
}

export function presentTeamWorkspace({
  teamId,
  leaderId,
  childTeamsCount,
  departmentName,
  parentTeamName,
  employees,
  visibleMembersLimit = 6,
}: PresentTeamWorkspaceInput): TeamWorkspaceViewModel {
  const teamEmployees = employees
    .filter(
      (employee) =>
        employee.team_id === teamId &&
        employee.status !== "terminated"
    )
    .sort((firstEmployee, secondEmployee) =>
      firstEmployee.full_name.localeCompare(
        secondEmployee.full_name,
        "pt-BR"
      )
    )

  const members = teamEmployees.map(
    (employee) =>
      presentMember(employee, leaderId)
  )

  const positionIds = new Set(
    teamEmployees
      .map(
        (employee) =>
          employee.position_id
      )
      .filter(
        (positionId): positionId is string =>
          Boolean(positionId)
      )
  )

  const leader =
    teamEmployees.find(
      (employee) =>
        employee.id === leaderId
    ) ?? null

  const visibleMembers =
    members.slice(
      0,
      visibleMembersLimit
    )

  return {
    metrics: [
      {
        id: "employees",
        label: "Colaboradores",
        value: teamEmployees.length,
        description:
          teamEmployees.length === 1
            ? "Pessoa vinculada ao time"
            : "Pessoas vinculadas ao time",
      },
      {
        id: "positions",
        label: "Cargos",
        value: positionIds.size,
        description:
          positionIds.size === 1
            ? "Cargo representado no time"
            : "Cargos representados no time",
      },
      {
        id: "leadership",
        label: "Liderança",
        value:
          leader?.full_name ??
          (leaderId
            ? "Líder externo"
            : "Não definida"),
        description:
          leaderId
            ? "Responsável atual pelo time"
            : "O time ainda não possui líder",
      },
      {
        id: "subteams",
        label: "Subtimes",
        value: childTeamsCount,
        description:
          childTeamsCount === 1
            ? "Time subordinado"
            : "Times subordinados",
      },
    ],

    context: {
      departmentLabel:
        departmentName ??
        "Sem departamento vinculado",
      parentTeamLabel:
        parentTeamName ??
        "Sem time superior",
    },

    members,
    visibleMembers,
    totalMembers: members.length,
    hasMembers: members.length > 0,
    remainingMembers:
      Math.max(
        members.length -
          visibleMembers.length,
        0
      ),
    leaderName:
      leader?.full_name ?? null,
  }
}
