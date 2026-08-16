import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")
const pages = {
  people: source(
    "../../../app/(dashboard)/app/people/page.tsx"
  ),
  person: source(
    "../../../app/(dashboard)/app/people/[id]/page.tsx"
  ),
  company: source(
    "../../../app/(dashboard)/app/company/page.tsx"
  ),
  department: source(
    "../../../app/(dashboard)/app/company/departments/[id]/page.tsx"
  ),
  teams: source(
    "../../../app/(dashboard)/app/company/teams/page.tsx"
  ),
  team: source(
    "../../../app/(dashboard)/app/company/teams/[id]/page.tsx"
  ),
  positions: source(
    "../../../app/(dashboard)/app/company/positions/page.tsx"
  ),
  position: source(
    "../../../app/(dashboard)/app/company/positions/[id]/page.tsx"
  ),
}
const adapter = source(
  "./get-management-route-read-models.ts"
)
const teamDepartmentOptionsAction = source(
  "../../organization/teams/actions/get-team-department-options-action.ts"
)
const peopleErrorPage = source(
  "../../../app/(dashboard)/app/people/error.tsx"
)
const companyErrorPage = source(
  "../../../app/(dashboard)/app/company/error.tsx"
)

test("in-scope pages consume management read models without legacy reads", () => {
  assert.match(pages.people, /getManagementPeople/)
  assert.match(pages.person, /getManagementPerson/)
  assert.match(pages.company, /getManagementDepartments/)
  assert.match(pages.department, /getManagementDepartments/)
  assert.match(pages.teams, /getManagementTeams/)
  assert.match(pages.team, /getManagementTeams/)
  assert.match(pages.positions, /getManagementPositions/)
  assert.match(
    pages.position,
    /getManagementPositionRequirements/
  )
  assert.match(
    pages.position,
    /getManagementPositionCompetencies/
  )
  assert.match(
    pages.position,
    /getManagementEntityTimeline/
  )

  for (const page of Object.values(pages)) {
    assert.doesNotMatch(
      page,
      /getEmployees|getEmployeeById|getDepartments|getDepartmentById|getTeams|getTeamById|getPositions|getPositionById|getPositionRequirementsByPosition|getPositionCompetenciesByPosition|getEntityTimeline|getEmployeeTimeline/
    )
    assert.doesNotMatch(
      page,
      /\.from\(|\.rpc\(|createClient|createBrowserClient|service_role/
    )
  }
})

test("adapter uses only approved RPCs with strict fail-closed validation", () => {
  for (const rpc of [
    "get_tenant_people_management_v1",
    "get_tenant_person_profile_v1",
    "get_tenant_departments_management_v1",
    "get_tenant_teams_management_v1",
    "get_tenant_positions_management_v1",
    "get_tenant_position_requirements_v1",
    "get_tenant_position_competencies_v1",
    "get_tenant_entity_activity_timeline_v1",
  ])
    assert.match(adapter, new RegExp(rpc))
  assert.match(adapter, /\.strict\(\)/)
  assert.match(adapter, /safeParse/)
  assert.match(
    adapter,
    /throw new ManagementRouteReadError/
  )
  assert.doesNotMatch(
    adapter,
    /\.from\(|createBrowserClient|service_role|error\.message/
  )
})

test("People integration uses semantic access and server-derived actor person identity", () => {
  assert.match(pages.people, /employee\.id === personId/)
  assert.doesNotMatch(pages.people, /employee\.user_id/)
  assert.match(
    adapter,
    /has_user_access: row\.has_user_access/
  )
  assert.doesNotMatch(adapter, /user_id:/)
})

test("directly reachable team options and route errors remain tenant-safe", () => {
  assert.match(
    teamDepartmentOptionsAction,
    /getCurrentCompanyContext/
  )
  assert.match(
    teamDepartmentOptionsAction,
    /getManagementDepartments/
  )
  assert.doesNotMatch(
    teamDepartmentOptionsAction,
    /companyId: string|createDepartmentRepository|\.from\(/
  )

  for (const errorPage of [
    peopleErrorPage,
    companyErrorPage,
  ]) {
    assert.match(errorPage, /Tente novamente/)
    assert.doesNotMatch(
      errorPage,
      /error\.message|SQLSTATE|PostgREST|42501/
    )
  }
})
