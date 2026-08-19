import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read("./repositories/job-opening-repository.ts")
const integration = read("./integrations/approval/recruitment-approval.ts")
const changeStatus = read("./services/change-job-opening-status.ts")
const detailPage = read(
  "../../../app/(dashboard)/app/recruitment/job-openings/[jobOpeningId]/page.tsx"
)

test("detail read and submit go through the 0094 trusted boundaries", () => {
  assert.match(repository, /get_tenant_job_opening_v1/)
  assert.match(repository, /submit_tenant_job_opening_for_approval_v1/)
  // The detail page loads the opening via the repository read (now the boundary).
  assert.match(detailPage, /getJobOpeningById\(/)
})

test("submit reuses the Approval Framework aggregate construction", () => {
  // The framework builds + serializes the aggregate/events; recruitment does not
  // reconstruct the event-sourced aggregate.
  assert.match(changeStatus, /buildApprovalRequestSubmission/)
  assert.match(integration, /this\.buildSubmission\(/)
  assert.match(integration, /this\.jobOpenings\.submitForApproval\(/)
})

test("the old non-atomic submit orchestration is gone", () => {
  // No separate save-approval use case nor direct-read relation validation in the
  // submit path.
  assert.doesNotMatch(changeStatus, /new CreateApprovalRequest\(/)
  assert.doesNotMatch(changeStatus, /validateJobOpeningRelations/)
})

test("the submit orchestration performs no protected direct reads/writes", () => {
  for (const source of [changeStatus, integration]) {
    assert.doesNotMatch(source, /\.from\(/)
    assert.doesNotMatch(source, /createBrowserClient|service_role/)
  }
})
