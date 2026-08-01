import type { DecisionFeedProvider } from "../aggregators"
import type {
  DecisionFeedDTO,
  DecisionFeedItemDTO,
  DecisionFeedPriority,
} from "../types"

export type OrganizationExecutiveDepartment = Readonly<{
  id: string
  name: string
  manager_id: string | null
  updated_at: string
}>

export type OrganizationExecutiveTeam = Readonly<{
  id: string
  name: string
  department_id: string | null
  manager_id: string | null
  updated_at: string
}>

export type OrganizationExecutivePosition = Readonly<{
  id: string
  name: string
  status: string
  hierarchical_level: string
  updated_at: string
}>

export type OrganizationExecutiveEmployee = Readonly<{
  id: string
  team_id: string | null
  position_id: string | null
  status: string
}>

export type OrganizationExecutiveSource = Readonly<{
  load(): Promise<{
    departments: readonly OrganizationExecutiveDepartment[]
    teams: readonly OrganizationExecutiveTeam[]
    positions: readonly OrganizationExecutivePosition[]
    employees: readonly OrganizationExecutiveEmployee[]
  }>
}>

export class OrganizationDecisionFeedProvider
  implements DecisionFeedProvider
{
  readonly key = "organization"

  constructor(
    private readonly generatedAt: string,
    private readonly source: OrganizationExecutiveSource,
  ) {}

  async load(): Promise<DecisionFeedDTO> {
    const {
      departments,
      teams,
      positions,
      employees,
    } = await this.source.load()

    const activeEmployees = employees.filter(
      (employee) =>
        employee.status !== "terminated",
    )

    const departmentItems = departments
      .filter((department) => !department.manager_id)
      .map(createDepartmentWithoutManagerItem)

    const teamLeaderItems = teams
      .filter((team) => !team.manager_id)
      .map(createTeamWithoutLeaderItem)

    const emptyTeamItems = teams
      .filter(
        (team) =>
          !activeEmployees.some(
            (employee) =>
              employee.team_id === team.id,
          ),
      )
      .map(createEmptyTeamItem)

    const vacantPositionItems = positions
      .filter(
        (position) =>
          position.status === "active" &&
          !activeEmployees.some(
            (employee) =>
              employee.position_id === position.id,
          ),
      )
      .map(createVacantPositionItem)

    return Object.freeze({
      generatedAt: this.generatedAt,
      items: Object.freeze([
        ...departmentItems,
        ...teamLeaderItems,
        ...emptyTeamItems,
        ...vacantPositionItems,
      ]),
    })
  }
}

function createDepartmentWithoutManagerItem(
  department: OrganizationExecutiveDepartment,
): DecisionFeedItemDTO {
  return Object.freeze({
    id: `organization:department-without-manager:${department.id}`,
    source: "organization",
    category: "organization",
    priority: "high",
    title: `Departamento sem gestor: ${department.name}`,
    description:
      "O departamento não possui um gestor responsável definido.",
    occurredAt: department.updated_at,
    href: `/app/company/departments/${department.id}`,
    badges: Object.freeze([
      "Sem gestor",
      "Departamento",
    ]),
  })
}

function createTeamWithoutLeaderItem(
  team: OrganizationExecutiveTeam,
): DecisionFeedItemDTO {
  return Object.freeze({
    id: `organization:team-without-leader:${team.id}`,
    source: "organization",
    category: "organization",
    priority: "high",
    title: `Equipe sem líder: ${team.name}`,
    description:
      "A equipe não possui uma liderança responsável definida.",
    occurredAt: team.updated_at,
    href: `/app/company/teams/${team.id}`,
    badges: Object.freeze([
      "Sem líder",
      "Equipe",
    ]),
  })
}

function createEmptyTeamItem(
  team: OrganizationExecutiveTeam,
): DecisionFeedItemDTO {
  return Object.freeze({
    id: `organization:empty-team:${team.id}`,
    source: "organization",
    category: "organization",
    priority: "medium",
    title: `Equipe sem colaboradores: ${team.name}`,
    description:
      "A equipe não possui colaboradores ativos vinculados.",
    occurredAt: team.updated_at,
    href: `/app/company/teams/${team.id}`,
    badges: Object.freeze([
      "Equipe vazia",
    ]),
  })
}

function createVacantPositionItem(
  position: OrganizationExecutivePosition,
): DecisionFeedItemDTO {
  return Object.freeze({
    id: `organization:vacant-position:${position.id}`,
    source: "organization",
    category: "organization",
    priority: resolveVacantPositionPriority(
      position.hierarchical_level,
    ),
    title: `Cargo ativo sem ocupante: ${position.name}`,
    description:
      "O cargo está ativo, mas não possui colaborador vinculado.",
    occurredAt: position.updated_at,
    href: `/app/company/positions/${position.id}`,
    badges: Object.freeze([
      "Cargo vago",
      getHierarchicalLevelLabel(
        position.hierarchical_level,
      ),
    ]),
  })
}

function resolveVacantPositionPriority(
  hierarchicalLevel: string,
): DecisionFeedPriority {
  if (
    hierarchicalLevel === "manager" ||
    hierarchicalLevel === "director" ||
    hierarchicalLevel === "executive"
  ) {
    return "high"
  }

  return "medium"
}

function getHierarchicalLevelLabel(
  hierarchicalLevel: string,
): string {
  const labels: Record<string, string> = {
    intern: "Estágio",
    assistant: "Assistente",
    analyst: "Analista",
    specialist: "Especialista",
    coordinator: "Coordenação",
    supervisor: "Supervisão",
    manager: "Gerência",
    director: "Diretoria",
    executive: "Executivo",
  }

  return labels[hierarchicalLevel] ?? hierarchicalLevel
}
