import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

const adapter = read(
  "../../../people-organization-mutations/people-organization-mutations.ts"
)
const errors = read("../../../people-organization-mutations/errors.ts")
const schema = read("../schemas/position-schema.ts")
const createAction = read("../actions/create-position-action.ts")
const updateAction = read("../actions/update-position-action.ts")
const form = read("./position-form/index.tsx")
const step = read("./position-form/steps/position-seniorities-step.tsx")
const review = read("./position-form/steps/position-review-step.tsx")
const createDialog = read("./position-create-dialog.tsx")
const editDialog = read("./position-edit-dialog.tsx")
const table = read("./position-table.tsx")
const listPage = read("../../../../app/(dashboard)/app/company/positions/page.tsx")
const detailPage = read(
  "../../../../app/(dashboard)/app/company/positions/[id]/page.tsx"
)

test("A/D. create/update go through the atomic Position+seniority boundaries", () => {
  assert.match(adapter, /create_tenant_position_with_seniorities_v1/)
  assert.match(adapter, /update_tenant_position_with_seniorities_v1/)
  // The legacy position boundaries are no longer the interactive write path.
  assert.doesNotMatch(adapter, /"create_tenant_position_v1"/)
  assert.doesNotMatch(adapter, /"update_tenant_position_v1"/)
})

test("A/D. the seniority set reaches both RPCs as p_seniority_level_ids", () => {
  const occurrences = adapter.match(/p_seniority_level_ids/g)
  assert.equal(occurrences?.length, 2)
})

test("B/E. an empty selection is supported and sent as []", () => {
  assert.match(adapter, /\[\.\.\.\(input\.seniorityLevelIds \?\? \[\]\)\]/)
  assert.match(schema, /seniorityLevelIds/)
  assert.match(schema, /\.optional\(\)/)
  assert.match(form, /useState<string\[\]>\(initialSeniorityLevelIds\)/)
})

test("C. edit preselects the current active applicable seniorities", () => {
  assert.match(form, /initialSeniorityLevelIds/)
  assert.match(editDialog, /initialSeniorityLevelIds/)
  assert.match(table, /applicableSeniorityLevelIdsByPosition/)
  assert.match(detailPage, /positionSeniorities\.applicable\.map/)
})

test("F/G. only ACTIVE catalog levels are offered; the base profile is never listed", () => {
  // The list page filters to active catalog levels.
  assert.match(listPage, /\.filter\(\(level\) => level\.active\)/)
  // The step offers only the passed catalog levels; no base/technical wording.
  assert.match(step, /seniorityLevels\.map/)
  assert.doesNotMatch(step, /\bbase\b/i)
  assert.doesNotMatch(step, /seniority_level_id/)
})

test("H. the review step summarises the selected seniorities", () => {
  assert.match(form, /seniorityLabels=\{\s*selectedSeniorityLabels\s*\}/)
  assert.match(review, /Senioridades aplicáveis/)
  assert.match(review, /Sem senioridade específica/)
})

test("I. the UI performs no follow-up add/archive seniority mutation", () => {
  for (const source of [form, createAction, updateAction, adapter]) {
    assert.doesNotMatch(source, /addPositionSeniorityAction|archivePositionSeniorityAction/)
    assert.doesNotMatch(source, /add_tenant_position_seniority|archive_tenant_position_seniority/)
  }
})

test("J. existing Position fields remain intact in the contract", () => {
  for (const field of ["p_name", "p_hierarchical_level", "p_status", "p_work_model"]) {
    assert.ok(adapter.includes(field), field)
  }
  assert.match(schema, /hierarchicalLevel/)
})

test("error mapping covers the atomic-boundary seniority error", () => {
  assert.ok(errors.includes("SENIORITY_LEVEL_NOT_FOUND"))
})

test("create/edit position dialogs disable outside-click dismissal", () => {
  assert.match(createDialog, /dismissible=\{false\}/)
  assert.match(editDialog, /dismissible=\{false\}/)
})

test("the create dialog and form thread the active seniority catalog", () => {
  assert.match(createDialog, /seniorityLevels/)
  assert.match(listPage, /seniorityLevels=\{seniorityLevels\}/)
  assert.match(form, /PositionSenioritiesStep/)
})
