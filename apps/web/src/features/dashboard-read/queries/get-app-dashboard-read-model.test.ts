import assert from "node:assert/strict"
import test from "node:test"

import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { resolve } from "node:path"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only"
      ? { shortCircuit: true, url: "server-only:test" }
      : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test"
      ? { format: "module", shortCircuit: true, source: "export {}" }
      : nextLoad(url, context)
  },
})

const queryModule = import("./get-app-dashboard-read-model")

test("presents an empty tenant without fabricating dashboard data", async () => {
  const { presentAppDashboardReadModel } = await queryModule
  const model = presentAppDashboardReadModel(
    "11111111-1111-4111-8111-111111111111",
    {
      organization: [],
      people: [],
      development: [],
      competencies: [],
      recruitment: [],
      activity: [],
    },
  )

  assert.deepEqual(model.health, {
    totalEmployees: 0,
    healthyEmployees: 0,
    attentionEmployees: 0,
    criticalEmployees: 0,
  })
  assert.deepEqual(model.organization, { departments: 0, positions: 0, teams: 0 })
  assert.deepEqual(model.developmentPriorities, [])
  assert.deepEqual(model.jobOpenings, [])
  assert.deepEqual(model.companyTimeline.items, [])
})

test("the /app graph uses only the authorized dashboard read repository", () => {
  const root = resolve(process.cwd(), "src")
  const page = readFileSync(resolve(root, "app/(dashboard)/app/page.tsx"), "utf8")
  const repository = readFileSync(
    resolve(root, "features/dashboard-read/repositories/tenant-dashboard-read-repository.ts"),
    "utf8",
  )
  const criticalTables = [
    "teams", "departments", "positions", "people", "development_plans",
    "development_goals", "development_actions", "development_templates",
    "competencies", "position_competencies", "employee_competencies",
    "recruitment_job_openings", "activity_events", "company_members", "companies",
  ]

  assert.match(page, /getAppDashboardReadModel\(companyId\)/)
  assert.doesNotMatch(page, /getEmployees|getTeams|getDepartments|getPositions|getJobOpenings/)
  for (const table of criticalTables) {
    assert.doesNotMatch(repository, new RegExp(`\\.from\\(["']${table}["']\\)`))
  }
})
