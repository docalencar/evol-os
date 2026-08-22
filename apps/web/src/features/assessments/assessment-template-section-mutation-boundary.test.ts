import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

const templateRepository = source(
  "./repositories/assessment-template-repository.ts"
)
const sectionRepository = source(
  "./repositories/assessment-section-repository.ts"
)
const templateCreateAction = source(
  "./actions/create-assessment-template-action.ts"
)
const templateUpdateAction = source(
  "./actions/update-assessment-template-action.ts"
)
const templateArchiveAction = source(
  "./actions/archive-assessment-template-action.ts"
)
const sectionCreateAction = source(
  "./actions/create-assessment-section-action.ts"
)
const sectionUpdateAction = source(
  "./actions/update-assessment-section-action.ts"
)
const sectionArchiveAction = source(
  "./actions/archive-assessment-section-action.ts"
)
const templateForm = source(
  "./components/assessment-template/assessment-template-form.tsx"
)
const templateCreateDialog = source(
  "./components/assessment-template/assessment-template-create-dialog.tsx"
)
const templateEditDialog = source(
  "./components/assessment-template/assessment-template-edit-dialog.tsx"
)
const sectionForm = source(
  "./components/assessment-section/assessment-section-form.tsx"
)
const sectionCreateDialog = source(
  "./components/assessment-section/assessment-section-create-dialog.tsx"
)
const sectionEditDialog = source(
  "./components/assessment-section/assessment-section-edit-dialog.tsx"
)
const userCopy = [
  "../../app/(dashboard)/app/assessments/templates/[id]/page.tsx",
  "../../app/(dashboard)/app/assessments/templates/[id]/preview/page.tsx",
  "./actions/archive-assessment-template-action.ts",
  "./actions/create-assessment-section-action.ts",
  "./actions/create-assessment-template-action.ts",
  "./actions/update-assessment-template-action.ts",
  "./components/assessment-cycle/generate-cycle-assessments-button.tsx",
  "./components/assessment-preview/assessment-template-preview.tsx",
  "./components/assessment-section/archive-assessment-section-button.tsx",
  "./components/assessment-section/assessment-section-create-dialog.tsx",
  "./components/assessment-section/assessment-section-table.tsx",
  "./components/assessment-template/archive-assessment-template-button.tsx",
  "./components/assessment-template/assessment-template-create-dialog.tsx",
  "./components/assessment-template/assessment-template-edit-dialog.tsx",
  "./components/assessment-template/assessment-template-form.tsx",
  "./components/assessment-template/assessment-template-overview-card.tsx",
  "./components/assessment-template/assessment-template-table.tsx",
  "./schemas/assessment-cycle-schema.ts",
  "./schemas/assessment-response-schema.ts",
  "./schemas/assessment-section-schema.ts",
  "./schemas/assessment-template-schema.ts",
].map(source).join("\n")

test("template repository cuts all mutations over to trusted RPCs", () => {
  assert.match(templateRepository, /create_tenant_assessment_template_v1/)
  assert.match(templateRepository, /update_tenant_assessment_template_v1/)
  assert.match(templateRepository, /archive_tenant_assessment_template_v1/)
  assert.doesNotMatch(templateRepository, /\.insert\(|\.update\(|\.delete\(/)
  assert.match(templateRepository, /p_name: data\.name/)
  assert.match(templateRepository, /p_status: data\.status/)
})

test("section repository preserves payload and uses only trusted RPC mutations", () => {
  assert.match(sectionRepository, /create_tenant_assessment_section_v1/)
  assert.match(sectionRepository, /update_tenant_assessment_section_v1/)
  assert.match(sectionRepository, /archive_tenant_assessment_section_v1/)
  assert.doesNotMatch(sectionRepository, /\.insert\(|\.update\(|\.delete\(/)
  assert.match(sectionRepository, /p_assessment_template_id: data\.assessmentTemplateId/)
  assert.match(sectionRepository, /p_display_order: data\.displayOrder/)
  assert.match(sectionRepository, /p_weight: data\.weight/)
})

test("actions keep safe errors and revalidate affected assessment routes", () => {
  for (const action of [
    templateCreateAction,
    templateUpdateAction,
    templateArchiveAction,
    sectionCreateAction,
    sectionUpdateAction,
    sectionArchiveAction,
  ]) {
    assert.doesNotMatch(action, /error\.message|console\.error|SQLSTATE|rpc/i)
    assert.match(action, /revalidatePath\("\/app\/assessments"\)/)
  }

  assert.match(templateUpdateAction, /templates\/\$\{assessmentTemplateId\}/)
  assert.match(templateArchiveAction, /templates\/\$\{assessmentTemplateId\}/)
  assert.match(sectionCreateAction, /error\.code === "23505"/)
  assert.doesNotMatch(sectionCreateAction, /idx_assessment_sections_unique_name/)
  assert.match(sectionCreateAction, /templates\/\$\{parsed\.data\.assessmentTemplateId\}/)
  assert.match(sectionUpdateAction, /templates\/\$\{parsed\.data\.assessmentTemplateId\}/)
  assert.match(sectionArchiveAction, /templates\/\$\{assessmentTemplateId\}/)
})

test("template and section forms close only through explicit cancel or success", () => {
  for (const dialog of [
    templateCreateDialog,
    templateEditDialog,
    sectionCreateDialog,
    sectionEditDialog,
  ]) {
    assert.match(dialog, /dismissible=\{false\}/)
    assert.match(dialog, /onCancel=\{\(\) => setOpen\(false\)\}/)
    assert.match(dialog, /onSuccess=\{\(\) => setOpen\(false\)\}/)
  }

  for (const form of [templateForm, sectionForm]) {
    assert.match(form, />\s*Cancelar\s*</)
    assert.match(form, /if \(!result\.success\) \{[\s\S]*?return[\s\S]*?\}/)
    assert.match(form, /onSuccess\?\.\(\)/)
  }
})

test("0111 presentation contract does not introduce unrelated assessment behavior", () => {
  const combined = [
    templateRepository,
    sectionRepository,
    templateCreateAction,
    templateUpdateAction,
    templateArchiveAction,
    sectionCreateAction,
    sectionUpdateAction,
    sectionArchiveAction,
  ].join("\n")

  assert.doesNotMatch(combined, /employee_competenc|talent|development_plan|gap/i)
})

test("Portuguese assessment UI consistently presents template concepts as modelo", () => {
  assert.match(userCopy, /Novo modelo/)
  assert.match(userCopy, /Modelos de avaliação/)
  assert.match(userCopy, /Total de modelos/)
  assert.match(userCopy, /Modelos ativos/)
  assert.doesNotMatch(
    userCopy,
    /Novo template|Templates? de avaliação|Total de templates|Templates? ativos|Templates? anuais|Nome do template|deste template|neste template|no template|para o template|Este template|Template sem|Criar template|Selecione um template/i
  )
})
