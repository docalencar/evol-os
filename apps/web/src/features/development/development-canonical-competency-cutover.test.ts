import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

const developmentService = read("./services/get-development-executive-dashboard.ts")
const developmentPage = read("../../app/(dashboard)/app/development/page.tsx")
const companyQuery = read("../competencies/person-competency-gaps/queries/get-canonical-company-person-competency-coverages.ts")
const companyRepository = read("../competencies/person-competency-gaps/repositories/company-person-competency-expectation-repository.ts")
const companyDerivation = read("../competencies/person-competency-gaps/services/derive-canonical-company-person-competency-coverages.ts")
const canonicalDerivation = read("../competencies/person-competency-gaps/services/derive-canonical-person-competency-coverage.ts")
const presenter = read("../dashboard-read/presenters/dashboard-competency-development-presenter.ts")
const peoplePage = read("../../app/(dashboard)/app/people/[id]/page.tsx")
const dashboardRepository = read("../dashboard-read/repositories/tenant-dashboard-read-repository.ts")
const talentInsights = read("../talent/services/create-employee-insights.ts")
const developmentDecisionFeed = read("../executive/decision-feed/adapters/development-decision-feed-provider.ts")

test("Development uses one company bulk 0124 boundary without person N+1", () => {
  assert.match(developmentService, /getCanonicalCompanyPersonCompetencyCoverages\(companyId\)/)
  assert.match(companyQuery, /repository\.findByCompany\(companyId\)/)
  assert.match(companyRepository, /get_tenant_company_person_competency_expectations_v1/)
  assert.doesNotMatch(companyRepository, /get_tenant_person_competency_expectations_v1["']/)
  assert.doesNotMatch(developmentService, /getCanonicalPersonCompetencyCoverage|for\s*\([^)]*\).*await/)
})

test("Development has retired the legacy expectation and negative-gap runtime", () => {
  assert.doesNotMatch(
    developmentService,
    /getManagementCompetencyAssignments|get_tenant_competency_directory_v1|calculateCompetencyGap|createEmployeeInsights|calculateRisk|calculateTalentCard|getBiggestGap|currentLevel\s*\?\?\s*0|expectedLevel\s*\?\?\s*0/,
  )
  assert.match(developmentService, /presentDashboardCompetencyDevelopment/)
  assert.match(developmentPage, /DevelopmentCompetencyIntelligenceCard/)
  assert.doesNotMatch(developmentPage, /CompanyCompetencyGapCard|DevelopmentPrioritiesCard/)
})

test("canonical derivation owns gap semantics and preserves factual assignment states", () => {
  assert.match(companyDerivation, /deriveCanonicalPersonCompetencyCoverage\(orderedRows\)/)
  assert.match(canonicalDerivation, /expectedLevel - currentLevel/)
  assert.match(canonicalDerivation, /currentLevel === null \? null/)
  assert.doesNotMatch(companyDerivation, /expected_level\s*-|current_level\s*-|\?\?\s*0|base/i)
  assert.match(presenter, /if \(gap === null\) return "unassessed"/)
  assert.match(presenter, /if \(gap > 0\) return "deficiency"/)
  assert.match(presenter, /if \(gap < 0\) return "exceeds"/)
  assert.match(presenter, /return "meets"/)
  assert.match(presenter, /\(right\.gap \?\? 0\) - \(left\.gap \?\? 0\)/)
  assert.doesNotMatch(presenter, /weight|required|competencyType|risk/)
  for (const state of [
    "no_position",
    "missing_profile",
    "stale_assignment",
    "active_assignment_with_no_expectations",
    "active_assignment_with_expectations",
  ]) {
    assert.match(canonicalDerivation, new RegExp(state))
  }
})

test("People and Dashboard remain canonical while Talent compatibility stays isolated", () => {
  assert.match(peoplePage, /getCanonicalPersonCompetencyCoverage\(companyId, id\)/)
  assert.match(dashboardRepository, /loadCompetencyCoverages\(companyId\)/)
  assert.doesNotMatch(dashboardRepository, /get_tenant_competency_directory_v1/)
  assert.match(talentInsights, /calculateRisk|calculateTalentCard|getBiggestGap/)
  assert.doesNotMatch(developmentService, /createEmployeeInsights/)
  // Same canonical source, now behind the authorization discriminant: the feed
  // reads the priorities only when the actor was entitled to load them.
  assert.match(developmentDecisionFeed, /competencyDevelopment\.development\.priorities/)
  assert.doesNotMatch(developmentDecisionFeed, /DevelopmentPriority|risk|criticalGaps|attentionGaps/)
})
