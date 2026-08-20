import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { intentKey } from "@/features/people-organization-mutations/idempotency"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read("./repositories/seniority-level-repository.ts")
const createAction = read("./actions/create-seniority-level-action.ts")
const updateAction = read("./actions/update-seniority-level-action.ts")
const archiveAction = read("./actions/archive-seniority-level-action.ts")
const form = read("./components/seniority-level-form.tsx")

test("reads go through the 0101 read boundary, mutations through the 0100 boundaries", () => {
  assert.match(repository, /get_tenant_seniority_levels_v1/)
  assert.match(repository, /create_tenant_seniority_level_v1/)
  assert.match(repository, /update_tenant_seniority_level_v1/)
  assert.match(repository, /archive_tenant_seniority_level_v1/)
})

test("no direct protected DML/SELECT on seniority_levels in the app path", () => {
  assert.doesNotMatch(repository, /\.from\("seniority_levels"\)/)
  for (const source of [createAction, updateAction, archiveAction, form]) {
    assert.doesNotMatch(source, /\.from\("seniority_levels"\)/)
    assert.doesNotMatch(source, /service_role|createBrowserClient/)
  }
})

test("create derives a stable idempotency key from the submission id", () => {
  assert.match(createAction, /submissionIdFromInput\(input\)/)
  assert.match(createAction, /isValidSubmissionId\(submissionId\)/)
  assert.doesNotMatch(createAction, /crypto\.randomUUID\(\)|Math\.random|Date\.now/)
  assert.match(
    repository,
    /p_idempotency_key: intentKey\(\s*"seniority-level:create",\s*companyId,\s*submissionId/
  )
})

test("the form keeps one submission id across retries and resets after success", () => {
  assert.match(form, /newSubmissionId\(\)/)
  assert.match(form, /submissionIdRef/)
  assert.match(form, /!submissionIdRef\.current[\s\S]*?newSubmissionId\(\)/)
  assert.match(form, /submissionIdRef\.current = null/)
})

test("update sends only code/label/rank — never active (active is archive-only)", () => {
  const updateBlock = repository.slice(
    repository.indexOf("update_tenant_seniority_level_v1"),
    repository.indexOf("async archive(")
  )
  assert.doesNotMatch(updateBlock, /p_active|\bactive\b/)
})

test("archive uses the dedicated boundary, not a generic active=false update", () => {
  const archiveBlock = repository.slice(repository.indexOf("async archive("))
  assert.match(archiveBlock, /archive_tenant_seniority_level_v1/)
  assert.doesNotMatch(archiveBlock, /active:\s*false/)
})

test("intentKey converges for the same submission and diverges otherwise", () => {
  const company = "11111111-1111-4111-8111-111111111111"
  const otherCompany = "22222222-2222-4222-8222-222222222222"
  const submission = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  const otherSubmission = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

  assert.equal(
    intentKey("seniority-level:create", company, submission),
    intentKey("seniority-level:create", company, submission)
  )
  assert.notEqual(
    intentKey("seniority-level:create", company, submission),
    intentKey("seniority-level:create", company, otherSubmission)
  )
  assert.notEqual(
    intentKey("seniority-level:create", company, submission),
    intentKey("seniority-level:create", otherCompany, submission)
  )
})
