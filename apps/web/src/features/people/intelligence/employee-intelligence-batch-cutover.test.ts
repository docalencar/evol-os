import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const query = readFileSync(
  new URL("./queries/get-employee-intelligence-list.ts", import.meta.url),
  "utf8"
)
const assessmentBoundary = readFileSync(
  new URL(
    "../../assessments/repositories/company-assessment-summary-repository.ts",
    import.meta.url
  ),
  "utf8"
)
const workforceHealth = readFileSync(
  new URL("../../hr-intelligence/queries/get-workforce-health.ts", import.meta.url),
  "utf8"
)
const executiveOverview = readFileSync(
  new URL("../../executive/queries/get-executive-overview.ts", import.meta.url),
  "utf8"
)

test("Employee Intelligence composes the five canonical company batch reads", () => {
  assert.match(query, /await Promise\.all\(\[/)
  assert.match(query, /getManagementPeople\(companyId\)/)
  assert.match(query, /getManagementCompetencies\(companyId\)/)
  assert.match(query, /getManagementDevelopmentPlans\(companyId\)/)
  assert.match(query, /getCompanyAssessmentSummaries\(companyId\)/)
  assert.match(query, /getCanonicalCompanyPersonCompetencyCoverages\(companyId\)/)
  assert.match(query, /composeEmployeeIntelligenceList/)
})

test("Assessment facts use E-DB1 and fail closed", () => {
  assert.match(assessmentBoundary, /get_company_assessment_summary_v1/)
  assert.match(assessmentBoundary, /p_reason:\s*"employee_intelligence_list"/)
  assert.match(
    assessmentBoundary,
    /if \(response\.error\)[\s\S]*CompanyAssessmentSummaryReadError\("read_failed"\)/
  )
  assert.match(
    assessmentBoundary,
    /if \(!parsed\.success\)[\s\S]*CompanyAssessmentSummaryReadError\("invalid_response"\)/
  )
  assert.doesNotMatch(assessmentBoundary, /\.from\(/)
  assert.doesNotMatch(query, /catch\s*\(/)
})

test("the active list has no per-employee reads or direct-table workaround", () => {
  assert.doesNotMatch(query, /getEmployees\(/)
  assert.doesNotMatch(query, /ByEmployee\(/)
  assert.doesNotMatch(query, /for\s*\([^)]*employee/)
  assert.doesNotMatch(query, /employees\.(map|forEach)\s*\(\s*async/)
  assert.doesNotMatch(query, /\.from\(/)

  const companyReadCalls = query.match(/\(companyId\)/g) ?? []
  assert.equal(companyReadCalls.length, 5)
})

test("Workforce Health and Executive keep consuming the shared factual list", () => {
  assert.match(workforceHealth, /getEmployeeIntelligenceList\(companyId\)/)
  assert.match(executiveOverview, /getWorkforceHealth\(companyId\)/)
})
