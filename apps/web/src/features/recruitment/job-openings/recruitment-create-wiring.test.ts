import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read("./repositories/job-opening-repository.ts")
const service = read("./services/create-job-opening.ts")
const action = read("./actions/create-job-opening-action.ts")
const formOptions = read("./queries/get-job-opening-form-options.ts")

test("create persists through the 0093 trusted boundary, not direct DML", () => {
  assert.match(repository, /create_tenant_job_opening_v1/)
  // The create path maps the tenant + key payload to the RPC parameters.
  assert.match(repository, /p_company_id: input\.companyId/)
  assert.match(repository, /p_title: values\.title/)
  assert.match(repository, /p_position_id: values\.positionId/)
  assert.match(repository, /p_idempotency_key: input\.idempotencyKey/)
  // No direct INSERT survives anywhere in the repository (create was the only one).
  assert.doesNotMatch(repository, /\.insert\(/)
})

test("create service delegates to the boundary and does not duplicate FK-validation or activity", () => {
  assert.match(service, /repository\.create\(/)
  assert.match(service, /idempotencyKey: crypto\.randomUUID\(\)/)
  assert.match(service, /values: input\.values/)
  // Tenant/FK validation and the activity write now live inside the RPC.
  assert.doesNotMatch(service, /validateJobOpeningRelations/)
  assert.doesNotMatch(service, /recordJobOpeningActivity/)
  assert.doesNotMatch(service, /\.from\(/)
})

test("create error is propagated as a failure, never a silent success", () => {
  assert.match(service, /if \(error \|\| !data\)/)
  assert.match(service, /throw new Error\(/)
  assert.match(action, /createJobOpeningSchema\.safeParse/)
  assert.match(action, /createJobOpening\(\{\s*companyId,\s*values: parsed\.data,\s*\}\)/)
  assert.match(action, /failureResult\(/)
})

test("wizard options load via management read boundaries, not protected direct reads", () => {
  assert.match(formOptions, /getManagementDepartments\(companyId\)/)
  assert.match(formOptions, /getManagementPositions\(companyId\)/)
  assert.match(formOptions, /getManagementPeople\(companyId\)/)
  assert.doesNotMatch(formOptions, /getPositions\(|getDepartments\(|getEmployees\(/)
  assert.doesNotMatch(formOptions, /\.from\(/)
})
