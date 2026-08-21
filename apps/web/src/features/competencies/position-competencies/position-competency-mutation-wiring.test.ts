import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read("./repositories/position-competency-repository.ts")
const createAction = read("./actions/create-position-competency-action.ts")
const updateAction = read("./actions/update-position-competency-action.ts")
const archiveAction = read("./actions/archive-position-competency-action.ts")
const form = read("./components/position-competency-form.tsx")
const dialog = read("./components/position-competency-create-dialog.tsx")
const crudDialog = read(
  "../../../components/shared/crud/crud-create-dialog.tsx"
)

test("Position Competency mutations use only the trusted RPC boundaries", () => {
  assert.match(repository, /create_tenant_position_competency_v1/)
  assert.match(repository, /update_tenant_position_competency_v1/)
  assert.match(repository, /archive_tenant_position_competency_v1/)
  assert.doesNotMatch(
    repository,
    /\.from\("position_competencies"\)\s*\.(insert|update|delete)/
  )

  for (const source of [repository, createAction, updateAction, archiveAction]) {
    assert.doesNotMatch(source, /service_role|createBrowserClient/)
  }
})

test("repository forwards the complete expectation payload to create and update", () => {
  for (const field of [
    "p_position_id: input.positionId",
    "p_competency_id: input.competencyId",
    "p_expected_level: input.expectedLevel",
    "p_weight: input.weight",
    "p_required: input.required",
    "p_type: input.type",
    "p_notes: input.notes || null",
  ]) {
    assert.equal(repository.split(field).length, 3, `${field} is sent twice`)
  }
})

test("failure keeps form state and success alone invokes the close callback", () => {
  assert.match(form, /if \(!result\.success\) \{[\s\S]*?toast\.error\(result\.message\)[\s\S]*?return/)
  assert.match(form, /toast\.success\(result\.message\)[\s\S]*?onSuccess\?\.\(\)/)
  assert.match(dialog, /onSuccess=\{close\}/)
  assert.match(form, /useState\(/)
  for (const action of [createAction, updateAction]) {
    assert.match(
      action,
      /revalidatePath\(`\/app\/company\/positions\/\$\{parsed\.data\.positionId\}`\)/
    )
  }
})

test("Position Competency opts into non-dismissible behavior without changing wrapper defaults", () => {
  assert.match(dialog, /dismissible=\{false\}/)
  assert.match(crudDialog, /dismissible\?: boolean/)
  assert.match(crudDialog, /dismissible=\{dismissible\}/)
  assert.doesNotMatch(crudDialog, /dismissible\s*=\s*false/)
  assert.match(crudDialog, /onOpenChange=\{setOpen\}/)
  assert.match(crudDialog, /children\(\{ close \}\)/)
})

test("association flow never creates a catalog competency", () => {
  for (const source of [repository, createAction, form, dialog]) {
    assert.doesNotMatch(source, /create_tenant_competency_v1/)
    assert.doesNotMatch(source, /\.from\("competencies"\)\s*\.insert/)
  }
})
