import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read("../repositories/company-turnover-repository.ts")
const query = read("./get-company-turnover-for-analytics.ts")
const page = read("../../../../app/(dashboard)/app/analytics/page.tsx")
const smartIndicators = read("./get-smart-people-indicators.ts")

test("the active Analytics Turnover path uses only the purpose-bound RPC", () => {
  assert.match(repository, /get_company_turnover_v1/)
  assert.match(repository, /analytics_turnover_summary/)
  assert.match(page, /getCompanyTurnoverForAnalytics\(companyId\)/)

  for (const source of [repository, query, page]) {
    assert.doesNotMatch(source, /\.from\(["'](?:people|activity_events|company_turnover_monthly_facts)["']\)/)
    assert.doesNotMatch(source, /service_role/)
  }
})

test("the synthetic Turnover indicator is retired without changing independent Analytics sources", () => {
  assert.doesNotMatch(smartIndicators, /id:\s*["']turnover["']/)
  assert.match(smartIndicators, /id:\s*["']hires["']/)
  assert.match(smartIndicators, /id:\s*["']average_time_to_hire["']/)
  assert.match(smartIndicators, /id:\s*["']average_approval_time["']/)
  assert.match(page, /Promise\.all/)
})

test("authorization is delegated to the trusted boundary rather than browser role filtering", () => {
  const roleLiteral = /["'](?:owner|admin|hr|manager|employee)["']/
  assert.doesNotMatch(repository, roleLiteral)
  assert.doesNotMatch(query, roleLiteral)
  assert.doesNotMatch(page, roleLiteral)
})
