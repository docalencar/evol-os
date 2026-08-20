import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

const adapter = read(
  "../../people-organization-mutations/people-organization-mutations.ts"
)
const errors = read("../../people-organization-mutations/errors.ts")
const readModel = read(
  "../../dashboard-read/queries/get-management-route-read-models.ts"
)
const form = read("./employee-form.tsx")
const step = read("./steps/employee-organization-step.tsx")
const loader = read("../queries/get-people-seniority-options.ts")
const schema = read("../schemas/employee-schema.ts")
const createAction = read("../actions/create-employee-action.ts")
const sidebar = read("../profile/components/employee-profile-sidebar.tsx")
const presenter = read(
  "../profile/presenters/present-employee-workspace.ts"
)
const newPage = read("../../../app/(dashboard)/app/people/new/page.tsx")
const listPage = read("../../../app/(dashboard)/app/people/page.tsx")
const detailPage = read("../../../app/(dashboard)/app/people/[id]/page.tsx")

test("1-3. interactive create/update go through the v2 boundaries, never person v1", () => {
  assert.match(adapter, /create_tenant_person_v2/)
  assert.match(adapter, /update_tenant_person_v2/)
  assert.doesNotMatch(adapter, /create_tenant_person_v1/)
  assert.doesNotMatch(adapter, /update_tenant_person_v1/)
})

test("4-5. People list and detail read through the v3 boundaries", () => {
  assert.match(readModel, /get_tenant_people_management_v3/)
  assert.match(readModel, /get_tenant_person_profile_v3/)
  // The historical readers (used by People list/detail) no longer call v2.
  assert.doesNotMatch(readModel, /get_tenant_people_management_v2/)
  assert.doesNotMatch(readModel, /get_tenant_person_profile_v2/)
})

test("6. no direct people DML in the interactive write/read path", () => {
  for (const source of [adapter, form, step, loader]) {
    assert.doesNotMatch(source, /\.from\("people"\)/)
    assert.doesNotMatch(source, /\.insert\(/)
    assert.doesNotMatch(source, /\.update\(/)
  }
})

test("7. no service_role / browser client in the write path", () => {
  for (const source of [adapter, form, step, loader]) {
    assert.doesNotMatch(source, /service_role|createBrowserClient/)
  }
})

test("8. companyId is server-derived, not client-supplied", () => {
  assert.match(createAction, /getCurrentCompanyContext\(\)/)
  assert.match(newPage, /getCurrentCompanyContext\(\)/)
  assert.match(listPage, /getCurrentCompanyContext\(\)/)
})

test("9. the explicit profile reaches both v2 RPCs", () => {
  assert.match(
    adapter,
    /p_position_seniority_profile_id:\s*nn\(input\.positionSeniorityProfileId\)/
  )
  const occurrences = adapter.match(
    /p_position_seniority_profile_id/g
  )
  assert.equal(occurrences?.length, 2)
})

test("10. the create idempotency lifecycle is preserved", () => {
  assert.match(form, /newSubmissionId\(\)/)
  assert.match(form, /submissionIdRef/)
  assert.match(adapter, /intentKey\("person:create"/)
})

test("11. seniority options are scoped to the selected position", () => {
  assert.match(
    form,
    /seniorityOptionsByPosition\[positionId\]/
  )
  assert.match(step, /seniorityOptions\.map/)
})

test("12-13. base profile is hidden; the default option maps to null", () => {
  assert.match(step, /Sem senioridade específica/)
  assert.match(step, /<option value="">/)
  // The base profile is never surfaced with technical wording.
  assert.doesNotMatch(step, /\bBase\b/)
  assert.doesNotMatch(step, /N\/A/)
  assert.doesNotMatch(step, /seniorityLevelId/)
  // Empty selection normalizes to null before reaching the RPC.
  assert.match(adapter, /nn\(input\.positionSeniorityProfileId\)/)
})

test("14. changing the position clears the stale seniority", () => {
  assert.match(form, /function handlePositionIdChange/)
  assert.match(
    form,
    /handlePositionIdChange[\s\S]*setPositionSeniorityProfileId\(""\)/
  )
  assert.match(
    form,
    /onPositionIdChange=\{\s*handlePositionIdChange\s*\}/
  )
})

test("15-16. edit preselects a specific profile; base starts as the default", () => {
  assert.match(
    form,
    /initialSeniorityProfileId\s*=\s*employee\?\.seniority_level_id/
  )
})

test("17. a historical archived current profile round-trips unchanged", () => {
  assert.match(form, /currentHistoricalSeniority/)
  assert.match(step, /arquivada/)
  // It is offered only as the current value, keyed by the existing profile id.
  assert.match(
    step,
    /value=\{\s*currentHistoricalSeniority\.profileId\s*\}/
  )
})

test("18-19. only active applicable profiles are offered as new choices", () => {
  // Options derive from getPositionSeniorities' `applicable` (active specific
  // profiles only) — archived profiles and archived seniorities are excluded.
  assert.match(loader, /getPositionSeniorities/)
  assert.match(loader, /applicable\.map/)
  assert.doesNotMatch(loader, /available/)
})

test("20. the detail view shows seniority as a concept separate from cargo", () => {
  assert.match(presenter, /seniorityLabel/)
  assert.match(sidebar, /label: "Cargo"/)
  assert.match(sidebar, /label: "Senioridade"/)
})

test("21. no Activity is created app-side (the v2 boundaries record it)", () => {
  for (const source of [adapter, createAction, form]) {
    assert.doesNotMatch(source, /activity_events|append.*[Aa]ctivity/)
  }
})

test("schema carries the seniority profile on create and overwrite", () => {
  const occurrences = schema.match(/positionSeniorityProfileId/g)
  assert.ok((occurrences?.length ?? 0) >= 2)
})

test("error mapping covers the v2 seniority error codes", () => {
  for (const code of [
    "POSITION_SENIORITY_PROFILE_POSITION_MISMATCH",
    "POSITION_SENIORITY_PROFILE_NOT_FOUND",
    "POSITION_SENIORITY_PROFILE_ARCHIVED",
    "POSITION_SENIORITY_PROFILE_INCOHERENT",
    "SENIORITY_LEVEL_ARCHIVED",
  ]) {
    assert.ok(errors.includes(code), `${code} is mapped`)
  }
})

test("the detail page loads and threads seniority options", () => {
  assert.match(detailPage, /getPeopleSeniorityOptions\(/)
  assert.match(detailPage, /seniorityOptionsByPosition/)
})
