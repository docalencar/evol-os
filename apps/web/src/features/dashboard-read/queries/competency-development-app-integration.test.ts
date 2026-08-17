import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const adapter = read("./get-competency-development-read-models.ts")
const competenciesPage = read("../../../app/(dashboard)/app/competencies/page.tsx")
const developmentPage = read("../../../app/(dashboard)/app/development/page.tsx")
const dashboard = read("../../development/services/get-development-executive-dashboard.ts")
const planPage = read("../../../app/(dashboard)/app/development/plans/[id]/page.tsx")
const templatesPage = read("../../../app/(dashboard)/app/development/templates/page.tsx")
const templatePage = read("../../../app/(dashboard)/app/development/templates/[id]/page.tsx")
const competencyError = read("../../../app/(dashboard)/app/competencies/error.tsx")
const developmentError = read("../../../app/(dashboard)/app/development/error.tsx")

test("in-scope routes use tenant management read boundaries", () => {
  assert.match(competenciesPage, /getManagementCompetencies\(companyId\)/)
  assert.match(developmentPage, /getDevelopmentExecutiveDashboard/)
  for (const name of ["Plans", "Goals", "Actions", "Templates"]) {
    assert.match(dashboard, new RegExp(`getManagementDevelopment${name}\\(companyId\\)`))
  }
  assert.match(planPage, /getManagementDevelopmentPlans\(companyId, id\)/)
  assert.match(planPage, /getManagementDevelopmentGoals\(companyId, id\)/)
  assert.match(planPage, /getManagementDevelopmentActions\(companyId, id\)/)
  assert.match(templatesPage, /getManagementDevelopmentTemplates\(companyId\)/)
  assert.match(templatePage, /getManagementDevelopmentTemplates\(companyId, id\)/)
  assert.match(templatePage, /getManagementDevelopmentTemplateGoals\(companyId, id\)/)
  assert.match(templatePage, /getManagementDevelopmentTemplateActions\(companyId, id\)/)
})

test("adapter is server-only, tenant-parametrized and has no direct-table fallback", () => {
  assert.match(adapter, /import "server-only"/)
  assert.match(adapter, /createServerDatabase\(\)/)
  assert.match(adapter, /p_company_id: companyId/)
  assert.doesNotMatch(adapter, /createBrowserClient|service_role|\.from\(/)
  for (const rpc of [
    "get_tenant_competencies_management_v1",
    "get_tenant_development_plans_management_v1",
    "get_tenant_development_goals_management_v1",
    "get_tenant_development_actions_management_v1",
    "get_tenant_development_templates_management_v1",
    "get_tenant_development_template_goals_v1",
    "get_tenant_development_template_actions_v1",
  ]) assert.match(adapter, new RegExp(rpc))
})

test("malformed and failed RPC responses fail closed with safe errors", () => {
  assert.match(adapter, /\.strict\(\)/)
  assert.match(adapter, /schema\.safeParse\(data\)/)
  assert.match(adapter, /if \(!parsed\.success\) throw new CompetencyDevelopmentReadError/)
  assert.doesNotMatch(adapter, /error\.message|console\.error/)
  assert.match(competencyError, /Tente novamente em instantes\./)
  assert.match(developmentError, /Tente novamente em instantes\./)
  assert.doesNotMatch(competencyError + developmentError, /error\.message|SQLSTATE|42501/)
})

test("empty and foreign selectors preserve safe page behavior", () => {
  assert.match(planPage, /if \(!plan\)\s*{\s*notFound\(\)/)
  assert.match(templatePage, /if \(!template\)\s*{\s*notFound\(\)/)
  assert.match(adapter, /z\.array\(planSchema\)/)
  assert.match(adapter, /z\.array\(templateSchema\)/)
})
