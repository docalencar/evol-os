import type {
  ProjectedDepartment,
  ProjectedPosition,
  ProjectedTeam,
  ProjectedVacancy,
  ProjectionIssue,
} from "../contracts"
import type {
  VacancyClosePayload,
  VacancyCreatePayload,
  VacancyUpdatePayload,
} from "./vacancy-change-set"

export type VacancyMutationResult =
  | Readonly<{ success: true; vacancies: readonly ProjectedVacancy[]; warning?: ProjectionIssue }>
  | Readonly<{ success: false; issue: ProjectionIssue }>

type OrganizationReferences = Readonly<{
  departments: readonly ProjectedDepartment[]
  teams: readonly ProjectedTeam[]
  positions: readonly ProjectedPosition[]
}>

export function createProjectedVacancy(
  vacancies: readonly ProjectedVacancy[],
  references: OrganizationReferences,
  changeSetId: string,
  payload: VacancyCreatePayload
): VacancyMutationResult {
  if (findVacancy(vacancies, payload.vacancyId)) {
    return failure("vacancy.create.id_already_exists", `Já existe uma vaga com o identificador ${payload.vacancyId}.`, changeSetId)
  }
  const placement = resolvePlacement(references, payload, changeSetId, "vacancy.create")
  if (!placement.success) return placement
  return success([...vacancies, Object.freeze({ id: payload.vacancyId, ...placement.value, status: "active" as const })])
}

export function updateProjectedVacancy(
  vacancies: readonly ProjectedVacancy[],
  references: OrganizationReferences,
  changeSetId: string,
  payload: VacancyUpdatePayload
): VacancyMutationResult {
  const current = findVacancy(vacancies, payload.vacancyId)
  if (!current) return failure("vacancy.update.not_found", `A vaga ${payload.vacancyId} não foi encontrada.`, changeSetId)
  if (current.status === "archived") return failure("vacancy.update.archived", `A vaga ${payload.vacancyId} está encerrada.`, changeSetId)

  const requested: { positionId?: string | null; departmentId?: string | null; teamId?: string | null } = {
    positionId: own(payload, "positionId") ? payload.positionId : current.positionId,
    teamId: own(payload, "teamId") ? payload.teamId : current.teamId,
  }
  if (own(payload, "departmentId")) requested.departmentId = payload.departmentId
  else if (!own(payload, "positionId") && !own(payload, "teamId")) requested.departmentId = current.departmentId

  const placement = resolvePlacement(references, requested, changeSetId, "vacancy.update")
  if (!placement.success) return placement
  const next = Object.freeze({ ...current, ...placement.value, status: "active" as const })
  if (samePlacement(current, next)) {
    return Object.freeze({ success: true, vacancies, warning: Object.freeze({
      code: "vacancy.update.no_changes",
      message: `A atualização da vaga ${current.id} não produz alterações.`,
      changeSetId,
    }) })
  }
  return replace(vacancies, current.id, next)
}

export function closeProjectedVacancy(
  vacancies: readonly ProjectedVacancy[],
  changeSetId: string,
  payload: VacancyClosePayload
): VacancyMutationResult {
  const current = findVacancy(vacancies, payload.vacancyId)
  if (!current) return failure("vacancy.close.not_found", `A vaga ${payload.vacancyId} não foi encontrada.`, changeSetId)
  if (current.status === "archived") {
    return Object.freeze({ success: true, vacancies, warning: Object.freeze({
      code: "vacancy.close.already_archived",
      message: `A vaga ${current.id} já está encerrada.`,
      changeSetId,
    }) })
  }
  return replace(vacancies, current.id, Object.freeze({ ...current, status: "archived" as const }))
}

function resolvePlacement(
  references: OrganizationReferences,
  requested: Readonly<{ positionId?: string | null; departmentId?: string | null; teamId?: string | null }>,
  changeSetId: string,
  operation: "vacancy.create" | "vacancy.update"
): Readonly<{ success: true; value: { positionId: string | null; departmentId: string | null; teamId: string | null } }> | Readonly<{ success: false; issue: ProjectionIssue }> {
  const positionId = requested.positionId ?? null
  const teamId = requested.teamId ?? null
  const position = positionId === null ? undefined : references.positions.find((item) => item.id === positionId)
  const team = teamId === null ? undefined : references.teams.find((item) => item.id === teamId)
  if (positionId !== null && (!position || position.status === "archived")) {
    return failure(`${operation}.position_${position ? "archived" : "not_found"}`, `O cargo ${positionId} não está disponível.`, changeSetId)
  }
  if (teamId !== null && (!team || team.status === "archived")) {
    return failure(`${operation}.team_${team ? "archived" : "not_found"}`, `O time ${teamId} não está disponível.`, changeSetId)
  }
  const departmentId = requested.departmentId !== undefined ? requested.departmentId : position?.departmentId ?? team?.departmentId ?? null
  const department = departmentId === null ? undefined : references.departments.find((item) => item.id === departmentId)
  if (departmentId !== null && (!department || department.status === "archived")) {
    return failure(`${operation}.department_${department ? "archived" : "not_found"}`, `O departamento ${departmentId} não está disponível.`, changeSetId)
  }
  if (position && position.departmentId !== departmentId) {
    return failure(`${operation}.position_department_mismatch`, `O cargo ${position.id} não pertence ao departamento ${departmentId}.`, changeSetId)
  }
  if (team && team.departmentId !== departmentId) {
    return failure(`${operation}.team_department_mismatch`, `O time ${team.id} não pertence ao departamento ${departmentId}.`, changeSetId)
  }
  return Object.freeze({ success: true, value: Object.freeze({ positionId, departmentId, teamId }) })
}

function samePlacement(left: ProjectedVacancy, right: ProjectedVacancy) {
  return left.positionId === right.positionId &&
    (left.departmentId ?? null) === (right.departmentId ?? null) &&
    (left.teamId ?? null) === (right.teamId ?? null)
}
function findVacancy(vacancies: readonly ProjectedVacancy[], vacancyId: string) {
  return vacancies.find((vacancy) => vacancy.id === vacancyId)
}
function replace(vacancies: readonly ProjectedVacancy[], vacancyId: string, next: ProjectedVacancy) {
  return success(vacancies.map((vacancy) => vacancy.id === vacancyId ? next : vacancy))
}
function success(vacancies: readonly ProjectedVacancy[]): VacancyMutationResult {
  return Object.freeze({ success: true, vacancies: Object.freeze([...vacancies]) })
}
function failure(code: string, message: string, changeSetId: string): Readonly<{ success: false; issue: ProjectionIssue }> {
  return Object.freeze({ success: false, issue: Object.freeze({ code, message, changeSetId }) })
}
function own(value: object, property: string) {
  return Object.prototype.hasOwnProperty.call(value, property)
}
