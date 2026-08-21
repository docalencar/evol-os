import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

// The six Organization create/edit form dialogs hardened by this slice.
const hardened = {
  "Department create": read(
    "./departments/components/department-create-dialog.tsx"
  ),
  "Department edit": read(
    "./departments/components/department-edit-dialog.tsx"
  ),
  "Team create": read(
    "./teams/components/team-create-dialog.tsx"
  ),
  "Team edit": read(
    "./teams/components/team-edit-dialog.tsx"
  ),
  "Seniority create": read(
    "./seniority-levels/components/seniority-level-create-dialog.tsx"
  ),
  "Seniority edit": read(
    "./seniority-levels/components/seniority-level-edit-dialog.tsx"
  ),
}

// Already hardened before this slice — must stay hardened.
const reference = {
  "Position create": read(
    "./positions/components/position-create-dialog.tsx"
  ),
  "Position edit": read(
    "./positions/components/position-edit-dialog.tsx"
  ),
  "Employee create": read(
    "../people/components/employee-create-dialog.tsx"
  ),
  "Employee edit": read(
    "../people/components/employee-edit-dialog.tsx"
  ),
}

// A confirmation-style dialog that must NOT be hardened.
const confirmDialog = read(
  "../../components/shared/confirm-dialog.tsx"
)

test("1-6. the six Organization create/edit dialogs pass dismissible={false}", () => {
  for (const [name, source] of Object.entries(hardened)) {
    assert.match(source, /<EntityDialog/)
    assert.match(source, /dismissible=\{false\}/, name)
  }
})

test("7/8. Position and Employee dialogs remain hardened", () => {
  for (const [name, source] of Object.entries(reference)) {
    assert.match(source, /dismissible=\{false\}/, name)
  }
})

test("9. each hardened dialog still renders its form and keeps an explicit close path", () => {
  const forms: Record<string, RegExp> = {
    "Department create": /DepartmentForm/,
    "Department edit": /DepartmentForm/,
    "Team create": /TeamForm/,
    "Team edit": /TeamForm/,
    "Seniority create": /SeniorityLevelForm/,
    "Seniority edit": /SeniorityLevelForm/,
  }
  for (const [name, source] of Object.entries(hardened)) {
    assert.match(source, forms[name], `${name} renders its form`)
    // Explicit close path preserved (successful submit / cancel closes).
    assert.match(source, /onSuccess|setOpen\(false\)/, `${name} close path`)
  }
})

test("10. no business logic changed — dialogs import no action/schema/RPC directly", () => {
  for (const [name, source] of Object.entries(hardened)) {
    assert.doesNotMatch(source, /-action|createTenant|_tenant_|\.rpc\(|createDepartmentSchema|createTeamSchema/, name)
  }
})

test("11. the confirmation dialog primitive was NOT hardened", () => {
  assert.doesNotMatch(confirmDialog, /dismissible=\{false\}/)
})
