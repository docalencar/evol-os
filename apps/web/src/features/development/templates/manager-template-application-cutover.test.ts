import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const root = new URL("./", import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), "utf8")

test("Development dashboard exposes consumption separately from authoring", () => {
  const page = read("../../../app/(dashboard)/app/development/page.tsx")
  assert.match(page, /getPublishedDevelopmentTemplateCatalog/)
  assert.match(page, /getTemplateApplicationPresentation/)
  assert.match(page, /<ApplyDevelopmentTemplateDialog/)
  assert.match(page, /isAdministrativeRole\(currentUser\.role\)[^]*Administrar templates/)
})

test("consumption uses catalog, readiness, confirmation and canonical readback", () => {
  const dialog = read("components/apply-development-template-dialog.tsx")
  const readiness = read("../actions/check-development-template-application-readiness-action.ts")
  const confirmation = read("../actions/confirm-development-template-application-action.ts")
  assert.match(dialog, /templates\.map/)
  assert.match(dialog, /checkDevelopmentTemplateApplicationReadinessAction/)
  assert.match(dialog, /confirmDevelopmentTemplateApplicationAction/)
  assert.match(readiness, /createServerDevelopmentTemplateReadiness/)
  assert.match(confirmation, /applyDevelopmentTemplateV2/)
  assert.match(confirmation, /getDevelopmentPlanById/)
  assert.match(confirmation, /canonicalPlan\.id/)
})

test("trusted 0132 boundary remains the manager authorization authority", () => {
  const migration = read("../../../../../../supabase/migrations/0132_extend_development_template_application_authorization.sql")
  assert.match(migration, /m\.role='manager'/)
  assert.match(migration, /employee\.manager_id=actor\.id/)
  assert.match(migration, /p_owner_id=actor\.id/)
  assert.match(migration, /reserve_development_template_application_v1/)
  assert.match(migration, /complete_development_template_application_v1/)
})
