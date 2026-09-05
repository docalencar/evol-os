import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const dashboardRepository = read("../repositories/tenant-dashboard-read-repository.ts")
const bulkRepository = read("../../competencies/person-competency-gaps/repositories/company-person-competency-expectation-repository.ts")
const companyDerivation = read("../../competencies/person-competency-gaps/services/derive-canonical-company-person-competency-coverages.ts")
const dashboardQuery = read("./get-app-dashboard-read-model.ts")
const dashboardPage = read("../../../app/(dashboard)/app/page.tsx")
const peoplePage = read("../../../app/(dashboard)/app/people/[id]/page.tsx")
const developmentDashboard = read("../../development/services/get-development-executive-dashboard.ts")

test("Dashboard uses one canonical company bulk boundary and no person N+1", () => {
  assert.match(bulkRepository, /get_tenant_company_person_competency_expectations_v1/)
  assert.doesNotMatch(bulkRepository, /get_tenant_person_competency_expectations_v1["']/)
  assert.match(dashboardRepository, /loadCompetencyCoverages\(companyId\)/)
  assert.doesNotMatch(dashboardRepository, /get_tenant_competency_directory_v1/)
})

test("Dashboard delegates grouping and canonical gap semantics to existing services", () => {
  assert.match(companyDerivation, /deriveCanonicalPersonCompetencyCoverage\(orderedRows\)/)
  assert.doesNotMatch(companyDerivation, /expected_level\s*-|current_level\s*-|\?\?\s*0/)
  assert.doesNotMatch(dashboardQuery, /calculateCompetencyGap|createEmployeeInsights|getEmployeeGaps/)
  assert.match(dashboardPage, /DashboardCompetencyDevelopmentCard/)
  assert.doesNotMatch(dashboardPage, /DevelopmentPrioritiesCard/)
})

test("People remains canonical and Development remains on compatibility semantics", () => {
  assert.match(peoplePage, /getCanonicalPersonCompetencyCoverage\(companyId, id\)/)
  assert.match(developmentDashboard, /getManagementCompetencyAssignments\(companyId\)/)
})
