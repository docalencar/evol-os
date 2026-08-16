import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const peopleNewPage = readFileSync(
  new URL("../../../app/(dashboard)/app/people/new/page.tsx", import.meta.url),
  "utf8",
)
const recruitmentPage = readFileSync(
  new URL("../../../app/(dashboard)/app/recruitment/page.tsx", import.meta.url),
  "utf8",
)
const query = readFileSync(new URL("./get-navigable-route-read-models.ts", import.meta.url), "utf8")
const legacyPeopleQuery = readFileSync(
  new URL("../../people/queries/get-employees.ts", import.meta.url),
  "utf8",
)

test("covered navigable routes use only server-scoped projection adapters", () => {
  assert.match(peopleNewPage, /getPeopleCreationOptions\(companyId\)/)
  assert.doesNotMatch(peopleNewPage, /getEmployees|getTeams|getPositions/)
  assert.match(recruitmentPage, /getRecruitmentWorkspaceReadModel\(companyId\)/)
  assert.doesNotMatch(recruitmentPage, /getJobOpenings|getJobOpeningFormOptions/)
  assert.match(query, /createServerDatabase\(\)/)
  assert.doesNotMatch(query, /createBrowserClient|service_role|\.from\(/)
})

test("legacy People failures no longer expose raw PostgREST details", () => {
  assert.doesNotMatch(legacyPeopleQuery, /console\.error|error\.message/)
  assert.match(legacyPeopleQuery, /Não foi possível carregar as pessoas\./)
})
