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

test("reject reuses the 0096 read boundary and persists through the 0098 boundary", () => {
  // The pending aggregate is read with the same read boundary as approve.
  assert.match(repository, /get_tenant_job_opening_pending_approval_v1/)
  // Persistence goes exclusively through the atomic reject boundary.
  assert.match(repository, /reject_tenant_job_opening_v1/)
  assert.match(
    repository,
    /reject_tenant_job_opening_v1[\s\S]*?p_expected_version: input\.expectedVersion/
  )
})

test("reject reuses the Approval Framework decision with outcome rejected", () => {
  // The framework rehydrates, decides and serializes — engine reused, not rebuilt.
  assert.match(decisionBuilder, /mapApprovalRequestToDomain\(/)
  assert.match(decisionBuilder, /aggregate\.decide\(/)
  assert.match(decisionBuilder, /mapApprovalRequestToPersistence\(/)
  // The shared builder carries the decision comment (fixed reason for now).
  assert.match(decisionBuilder, /comment: input\.comment \?\? null/)
  // expected_version is the ORIGINAL version, captured before the decision.
  assert.match(
    decisionBuilder,
    /const expectedVersion = aggregate\.version/
  )
  // The recruitment reject orchestration wires it end to end.
  assert.match(integration, /outcome: "rejected"/)
  assert.match(integration, /this\.jobOpenings\.loadPendingApproval\(/)
  assert.match(integration, /this\.buildDecision\(/)
  assert.match(integration, /this\.jobOpenings\.reject\(/)
  assert.match(
    integration,
    /reject[\s\S]*?expectedVersion: built\.data\.expectedVersion/
  )
  assert.match(changeStatus, /buildApprovalDecisionSubmission/)
})

test("the old direct-read reject orchestration is gone", () => {
  // No direct approval_requests reads nor legacy status sync in the reject path.
  assert.doesNotMatch(integration, /synchronizeStatus/)
  assert.doesNotMatch(integration, /requirePendingApproval/)
  assert.doesNotMatch(changeStatus, /getApprovalRequests/)
  assert.doesNotMatch(changeStatus, /createApprovalRequestRepository/)
  assert.doesNotMatch(changeStatus, /new RejectRequest\(/)
})

test("the reject orchestration performs no protected direct reads/writes", () => {
  for (const source of [changeStatus, integration]) {
    assert.doesNotMatch(source, /\.from\(/)
    assert.doesNotMatch(source, /createBrowserClient|service_role/)
  }
})
