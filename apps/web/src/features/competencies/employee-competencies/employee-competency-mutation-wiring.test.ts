import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read("./repositories/employee-competency-repository.ts")
const createAction = read("./actions/create-employee-competency-action.ts")
const updateAction = read("./actions/update-employee-competency-action.ts")
const archiveAction = read("./actions/archive-employee-competency-action.ts")
const form = read("./components/employee-competency-form.tsx")
const card = read("./components/employee-competencies-card.tsx")
const createDialog = read("./components/employee-competency-create-dialog.tsx")
const editDialog = read("./components/employee-competency-edit-dialog.tsx")

test("writes use only the three trusted Employee Competency RPCs", () => {
  assert.match(repository, /create_tenant_employee_competency_v1/)
  assert.match(repository, /update_tenant_employee_competency_v1/)
  assert.match(repository, /archive_tenant_employee_competency_v1/)
  assert.doesNotMatch(
    repository,
    /\.from\("employee_competencies"\)\s*\.(insert|update|delete)/
  )
  for (const source of [repository, createAction, updateAction, archiveAction]) {
    assert.doesNotMatch(source, /service_role|createBrowserClient/)
  }
})

test("create and update forward every canonical field while keeping endpoints explicit", () => {
  for (const field of [
    "p_employee_id: input.employeeId",
    "p_competency_id: input.competencyId",
    "p_current_level: input.currentLevel",
    "p_source: input.source",
    "p_validated_at: input.validatedAt || null",
    "p_notes: input.notes || null",
  ]) {
    assert.equal(repository.split(field).length, 3, `${field} is sent twice`)
  }
})

test("actions keep safe errors and revalidate the exact Person profile", () => {
  for (const action of [createAction, updateAction]) {
    assert.match(action, /revalidatePath\(`\/app\/people\/\$\{parsed\.data\.employeeId\}`\)/)
    assert.doesNotMatch(action, /error\.message/)
  }
  assert.match(archiveAction, /revalidatePath\([\s\S]*?`\/app\/people\/\$\{employeeId\}`/)
  assert.doesNotMatch(archiveAction, /error\.message/)
})

test("form failure preserves state and success alone closes", () => {
  assert.match(form, /if \(!result\.success\) \{[\s\S]*?toast\.error\(result\.message\)[\s\S]*?return/)
  assert.match(form, /toast\.success\(result\.message\)[\s\S]*?onSuccess\?\.\(\)/)
  assert.match(form, /onCancel\?: \(\) => void/)
  assert.match(form, />\s*Cancelar\s*</)
})

test("create and edit dialogs are non-dismissible with explicit close paths", () => {
  for (const dialog of [createDialog, editDialog]) {
    assert.match(dialog, /dismissible=\{false\}/)
    assert.match(dialog, /onSuccess=\{\(\) =>[\s\S]*?setOpen\(false\)/)
    assert.match(dialog, /onCancel=\{\(\) =>[\s\S]*?setOpen\(false\)/)
  }
})

test("the profile card accepts the persisted timestamptz validation value", () => {
  assert.match(card, /value\.includes\("T"\)/)
  assert.doesNotMatch(card, /new Date\(`\$\{value\}T00:00:00`\)/)
})
