import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const openJobs = read("./get-open-job-openings-for-analytics.ts")
const headcount = read("./get-organization-headcount-for-analytics.ts")
const pendingApprovals = read(
  "./get-pending-job-opening-approvals-for-analytics.ts"
)
const dashboard = read("./get-people-analytics-dashboard.ts")

test("recruitment analytics loaders read through the approved tenant boundaries", () => {
  assert.match(
    openJobs,
    /get_tenant_recruitment_open_openings_v1/
  )
  assert.match(
    headcount,
    /get_tenant_recruitment_open_openings_v1/
  )
  assert.match(
    pendingApprovals,
    /get_tenant_recruitment_pending_approvals_v1/
  )
})

test("recruitment analytics loaders perform no protected direct reads", () => {
  for (const source of [openJobs, headcount, pendingApprovals]) {
    assert.doesNotMatch(
      source,
      /\.from\(["'](recruitment_job_openings|approval_requests|people)["']\)/
    )
    assert.doesNotMatch(
      source,
      /createClient|createBrowserClient|service_role/
    )
  }
})

test("recruitment analytics loaders fail closed with safe messages", () => {
  for (const source of [openJobs, headcount, pendingApprovals]) {
    assert.doesNotMatch(source, /error\.message/)
    assert.match(source, /safeParse/)
    assert.match(source, /throw new Error\(/)
    assert.match(source, /Não foi possível carregar/)
  }
})

test("dashboard composition degrades a single failed indicator instead of erroring the page", () => {
  assert.match(dashboard, /resolveOrEmpty\(/)
  // Every indicator loads through the resilient wrapper.
  assert.match(
    dashboard,
    /resolveOrEmpty\(getActiveEmployeesForAnalytics\(companyId\)\)/
  )
  assert.match(
    dashboard,
    /resolveOrEmpty\(getOpenJobOpeningsForAnalytics\(companyId\)\)/
  )
})
