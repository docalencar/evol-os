import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read("./repositories/job-opening-repository.ts")
const integration = read("./integrations/approval/recruitment-approval.ts")
const changeStatus = read("./services/change-job-opening-status.ts")
const decisionBuilder = read(
  "../../approval/application/build-approval-decision-submission.ts"
)

test("approve reads and persists through the 0096 trusted boundaries", () => {
  assert.match(repository, /get_tenant_job_opening_pending_approval_v1/)
  assert.match(repository, /approve_tenant_job_opening_v1/)
  assert.match(
    repository,
    /p_expected_version: input\.expectedVersion/
  )
})

test("approve reuses the Approval Framework decision (no engine reimplementation)", () => {
  // The framework rehydrates the aggregate, runs the domain rule and serializes.
  assert.match(decisionBuilder, /mapApprovalRequestToDomain\(/)
  assert.match(decisionBuilder, /aggregate\.decide\(/)
  assert.match(decisionBuilder, /mapApprovalRequestToPersistence\(/)
  // expected_version is the ORIGINAL version, captured before the decision.
  assert.match(
    decisionBuilder,
    /const expectedVersion = aggregate\.version/
  )
  // The recruitment orchestration wires it end to end.
  assert.match(changeStatus, /buildApprovalDecisionSubmission/)
  assert.match(integration, /this\.jobOpenings\.loadPendingApproval\(/)
  assert.match(integration, /this\.buildDecision\(/)
  assert.match(integration, /this\.jobOpenings\.approve\(/)
  assert.match(
    integration,
    /expectedVersion: built\.data\.expectedVersion/
  )
})

test("the old non-atomic approve orchestration is gone", () => {
  // No separate approve use case nor legacy status sync in the approve branch.
  assert.doesNotMatch(changeStatus, /new ApproveRequest\(/)
})

test("the approve orchestration performs no protected direct reads/writes", () => {
  for (const source of [changeStatus, integration]) {
    assert.doesNotMatch(source, /\.from\(/)
    assert.doesNotMatch(source, /createBrowserClient|service_role/)
  }
})
