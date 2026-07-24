import type {
  ProjectedDepartment,
  ProjectedTeam,
  ProjectionInternalEvent,
  ProjectionIssue,
  TeamMutableField,
} from "../contracts"
import type {
  TeamArchivePayload,
  TeamCreatePayload,
  TeamUpdatePayload,
} from "./team-change-set"

export type TeamMutationResult =
  | Readonly<{
      success: true
      teams: readonly ProjectedTeam[]
      event?: ProjectionInternalEvent
      warning?: ProjectionIssue
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

export function createProjectedTeam(
  teams: readonly ProjectedTeam[],
  departments: readonly ProjectedDepartment[],
  changeSetId: string,
  payload: TeamCreatePayload
): TeamMutationResult {
  if (findTeamById(teams, payload.teamId)) {
    return failure(
      "team.create.id_already_exists",
      `Já existe um time com o identificador ${payload.teamId}.`,
      changeSetId
    )
  }

  if (findActiveTeamByName(teams, payload.name)) {
    return failure(
      "team.create.name_already_exists",
      `Já existe um time ativo com o nome ${payload.name}.`,
      changeSetId
    )
  }

  if (
    payload.code !== null &&
    findActiveTeamByCode(teams, payload.code)
  ) {
    return failure(
      "team.create.code_already_exists",
      `Já existe um time ativo com o código ${payload.code}.`,
      changeSetId
    )
  }

  const departmentValidation = validateDepartment(
    departments,
    payload.departmentId,
    changeSetId,
    "team.create"
  )

  if (!departmentValidation.success) {
    return departmentValidation
  }

  const team: ProjectedTeam = Object.freeze({
    id: payload.teamId,
    name: normalizeRequiredText(payload.name),
    code: normalizeNullableText(payload.code),
    description: normalizeNullableText(payload.description),
    departmentId: payload.departmentId,
    status: "active",
  })

  return success(
    [...teams, team],
    Object.freeze({
      type: "team.created",
      changeSetId,
      teamId: team.id,
    })
  )
}

export function updateProjectedTeam(
  teams: readonly ProjectedTeam[],
  departments: readonly ProjectedDepartment[],
  changeSetId: string,
  payload: TeamUpdatePayload
): TeamMutationResult {
  const currentTeam = findTeamById(teams, payload.teamId)

  if (!currentTeam) {
    return failure(
      "team.update.not_found",
      `O time ${payload.teamId} não foi encontrado.`,
      changeSetId
    )
  }

  if (currentTeam.status === "archived") {
    return failure(
      "team.update.archived",
      `O time ${payload.teamId} está arquivado e não pode ser atualizado.`,
      changeSetId
    )
  }

  if (!hasUpdateFields(payload)) {
    return failure(
      "team.update.empty_patch",
      `O change set ${changeSetId} não possui campos para atualização.`,
      changeSetId
    )
  }

  const nextTeam: ProjectedTeam = Object.freeze({
    ...currentTeam,
    name:
      payload.name === undefined
        ? currentTeam.name
        : normalizeRequiredText(payload.name),
    code:
      payload.code === undefined
        ? currentTeam.code
        : normalizeNullableText(payload.code),
    description:
      payload.description === undefined
        ? currentTeam.description
        : normalizeNullableText(payload.description),
    departmentId:
      payload.departmentId === undefined
        ? currentTeam.departmentId
        : payload.departmentId,
  })

  const duplicateName = findActiveTeamByName(
    teams,
    nextTeam.name,
    currentTeam.id
  )

  if (duplicateName) {
    return failure(
      "team.update.name_already_exists",
      `Já existe outro time ativo com o nome ${nextTeam.name}.`,
      changeSetId
    )
  }

  if (
    nextTeam.code !== null &&
    findActiveTeamByCode(
      teams,
      nextTeam.code,
      currentTeam.id
    )
  ) {
    return failure(
      "team.update.code_already_exists",
      `Já existe outro time ativo com o código ${nextTeam.code}.`,
      changeSetId
    )
  }

  if (nextTeam.departmentId === null) {
    return failure(
      "team.update.department_required",
      `O time ${currentTeam.id} deve estar vinculado a um departamento.`,
      changeSetId
    )
  }

  const departmentValidation = validateDepartment(
    departments,
    nextTeam.departmentId,
    changeSetId,
    "team.update"
  )

  if (!departmentValidation.success) {
    return departmentValidation
  }

  const changedFields = getChangedFields(
    currentTeam,
    nextTeam
  )

  if (changedFields.length === 0) {
    return Object.freeze({
      success: true,
      teams,
      warning: Object.freeze({
        code: "team.update.no_changes",
        message: `A atualização do time ${currentTeam.id} não produz alterações.`,
        changeSetId,
      }),
    })
  }

  return success(
    teams.map((team) =>
      team.id === currentTeam.id ? nextTeam : team
    ),
    Object.freeze({
      type: "team.updated",
      changeSetId,
      teamId: currentTeam.id,
      changedFields,
    })
  )
}

export function archiveProjectedTeam(
  teams: readonly ProjectedTeam[],
  changeSetId: string,
  payload: TeamArchivePayload
): TeamMutationResult {
  const currentTeam = findTeamById(teams, payload.teamId)

  if (!currentTeam) {
    return failure(
      "team.archive.not_found",
      `O time ${payload.teamId} não foi encontrado.`,
      changeSetId
    )
  }

  if (currentTeam.status === "archived") {
    return Object.freeze({
      success: true,
      teams,
      warning: Object.freeze({
        code: "team.archive.already_archived",
        message: `O time ${currentTeam.id} já está arquivado.`,
        changeSetId,
      }),
    })
  }

  const archivedTeam: ProjectedTeam = Object.freeze({
    ...currentTeam,
    status: "archived",
  })

  return success(
    teams.map((team) =>
      team.id === currentTeam.id ? archivedTeam : team
    ),
    Object.freeze({
      type: "team.archived",
      changeSetId,
      teamId: currentTeam.id,
    })
  )
}

function validateDepartment(
  departments: readonly ProjectedDepartment[],
  departmentId: string,
  changeSetId: string,
  operation: "team.create" | "team.update"
): TeamMutationResult | Readonly<{ success: true }> {
  const department = departments.find(
    (candidate) => candidate.id === departmentId
  )

  if (!department) {
    return failure(
      `${operation}.department_not_found`,
      `O departamento ${departmentId} não foi encontrado.`,
      changeSetId
    )
  }

  if (department.status === "archived") {
    return failure(
      `${operation}.department_archived`,
      `O departamento ${departmentId} está arquivado e não pode receber times.`,
      changeSetId
    )
  }

  return Object.freeze({
    success: true,
  })
}

function findTeamById(
  teams: readonly ProjectedTeam[],
  teamId: string
): ProjectedTeam | undefined {
  return teams.find((team) => team.id === teamId)
}

function findActiveTeamByName(
  teams: readonly ProjectedTeam[],
  name: string,
  ignoredTeamId?: string
): ProjectedTeam | undefined {
  const normalizedName = normalizeComparableText(name)

  return teams.find(
    (team) =>
      team.id !== ignoredTeamId &&
      team.status === "active" &&
      normalizeComparableText(team.name) === normalizedName
  )
}

function findActiveTeamByCode(
  teams: readonly ProjectedTeam[],
  code: string,
  ignoredTeamId?: string
): ProjectedTeam | undefined {
  const normalizedCode = normalizeComparableText(code)

  return teams.find(
    (team) =>
      team.id !== ignoredTeamId &&
      team.status === "active" &&
      team.code !== null &&
      normalizeComparableText(team.code) === normalizedCode
  )
}

function hasUpdateFields(
  payload: TeamUpdatePayload
): boolean {
  return (
    payload.name !== undefined ||
    payload.code !== undefined ||
    payload.description !== undefined ||
    payload.departmentId !== undefined
  )
}

function getChangedFields(
  currentTeam: ProjectedTeam,
  nextTeam: ProjectedTeam
): readonly TeamMutableField[] {
  const changedFields: TeamMutableField[] = []

  if (currentTeam.name !== nextTeam.name) {
    changedFields.push("name")
  }

  if (currentTeam.code !== nextTeam.code) {
    changedFields.push("code")
  }

  if (currentTeam.description !== nextTeam.description) {
    changedFields.push("description")
  }

  if (currentTeam.departmentId !== nextTeam.departmentId) {
    changedFields.push("departmentId")
  }

  return Object.freeze(changedFields)
}

function normalizeRequiredText(value: string): string {
  return value.trim()
}

function normalizeNullableText(
  value: string | null
): string | null {
  if (value === null) {
    return null
  }

  const normalized = value.trim()

  return normalized.length > 0 ? normalized : null
}

function normalizeComparableText(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR")
}

function success(
  teams: readonly ProjectedTeam[],
  event: ProjectionInternalEvent
): TeamMutationResult {
  return Object.freeze({
    success: true,
    teams: Object.freeze(
      teams.map((team) =>
        Object.isFrozen(team)
          ? team
          : Object.freeze({ ...team })
      )
    ),
    event,
  })
}

function failure(
  code: string,
  message: string,
  changeSetId: string
): TeamMutationResult {
  return Object.freeze({
    success: false,
    issue: Object.freeze({
      code,
      message,
      changeSetId,
    }),
  })
}
