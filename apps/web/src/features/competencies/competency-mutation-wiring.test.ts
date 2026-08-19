import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { intentKey } from "@/features/people-organization-mutations/idempotency"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read("./repositories/competency-repository.ts")
const createAction = read("./actions/create-competency-action.ts")
const updateAction = read("./actions/update-competency-action.ts")
const archiveAction = read("./actions/archive-competency-action.ts")
const form = read("./components/competency-form.tsx")

test("catalog mutations go through the 0099 trusted boundaries", () => {
  assert.match(repository, /create_tenant_competency_v1/)
  assert.match(repository, /update_tenant_competency_v1/)
  assert.match(repository, /archive_tenant_competency_v1/)
})

test("no direct protected competency DML remains in the mutation path", () => {
  assert.doesNotMatch(repository, /\.from\("competencies"\)\s*\.insert/)
  assert.doesNotMatch(repository, /\.from\("competencies"\)\s*\.update/)
  for (const source of [createAction, updateAction, archiveAction]) {
    assert.doesNotMatch(source, /\.from\("competencies"\)/)
    assert.doesNotMatch(source, /service_role|createBrowserClient/)
  }
})

test("create derives a stable idempotency key from the submission id", () => {
  // The action validates the client submission token (selector, not authority)
  // and does NOT mint a fresh key per retry.
  assert.match(createAction, /submissionIdFromInput\(input\)/)
  assert.match(createAction, /isValidSubmissionId\(submissionId\)/)
  assert.doesNotMatch(createAction, /crypto\.randomUUID\(\)/)
  assert.doesNotMatch(createAction, /Math\.random|Date\.now/)
  // The repository derives the key server-side via the shared intentKey helper.
  assert.match(
    repository,
    /p_idempotency_key: intentKey\("competency:create", companyId, submissionId\)/
  )
})

test("the form keeps one submission id across retries and resets after success", () => {
  assert.match(form, /newSubmissionId\(\)/)
  assert.match(form, /submissionIdRef/)
  // A new id is only minted when none is held for this submission.
  assert.match(form, /!submissionIdRef\.current[\s\S]*?newSubmissionId\(\)/)
  // After success the id is cleared so the next create is a new intent.
  assert.match(form, /submissionIdRef\.current = null/)
})

test("intentKey converges for the same submission and diverges otherwise", () => {
  const company = "11111111-1111-4111-8111-111111111111"
  const otherCompany = "22222222-2222-4222-8222-222222222222"
  const submission = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  const otherSubmission = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

  // Same submission → same key (a retry converges).
  assert.equal(
    intentKey("competency:create", company, submission),
    intentKey("competency:create", company, submission)
  )
  // Distinct submissions → distinct keys (legitimate new creates do not collide).
  assert.notEqual(
    intentKey("competency:create", company, submission),
    intentKey("competency:create", company, otherSubmission)
  )
  // companyId participates in the derivation (tenant scoping).
  assert.notEqual(
    intentKey("competency:create", company, submission),
    intentKey("competency:create", otherCompany, submission)
  )
})

test("update does not send active — archive is the dedicated boundary", () => {
  const updateBlock = repository.slice(
    repository.indexOf("update_tenant_competency_v1"),
    repository.indexOf("async archive(")
  )
  assert.doesNotMatch(updateBlock, /active/)
  assert.doesNotMatch(updateBlock, /p_active/)
})

test("archive uses the archive boundary, not a generic active=false update", () => {
  const archiveBlock = repository.slice(repository.indexOf("async archive("))
  assert.match(archiveBlock, /archive_tenant_competency_v1/)
  assert.doesNotMatch(archiveBlock, /active:\s*false/)
})
