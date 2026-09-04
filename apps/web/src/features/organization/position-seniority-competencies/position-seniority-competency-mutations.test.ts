import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  clearPositionSeniorityCompetencySchema,
  setPositionSeniorityCompetencySchema,
} from "./schemas/position-seniority-competency-command-schema"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read("./repositories/position-seniority-competency-repository.ts")
const setAction = read("./actions/set-position-seniority-competency-action.ts")
const clearAction = read("./actions/clear-position-seniority-competency-action.ts")
const editor = read("./components/position-seniority-competency-editor-dialog.tsx")
const section = read("./components/position-seniority-competency-matrix-section.tsx")

const identifiers = {
  positionId: "00000000-0000-4000-8000-000000000001",
  profileId: "00000000-0000-4000-8000-000000000002",
  competencyId: "00000000-0000-4000-8000-000000000003",
}

test("SET validates and transports the complete semantic row to the exact 0122 RPC", () => {
  assert.equal(
    setPositionSeniorityCompetencySchema.safeParse({
      ...identifiers,
      expectedLevel: 3,
      weight: 4,
      required: true,
      type: "core",
      notes: null,
    }).success,
    true
  )
  assert.match(repository, /set_tenant_position_seniority_competency_v1/)
  for (const parameter of [
    "p_company_id",
    "p_position_seniority_profile_id",
    "p_competency_id",
    "p_expected_level",
    "p_weight",
    "p_required",
    "p_type",
    "p_notes",
  ]) {
    assert.match(repository, new RegExp(parameter))
  }
  assert.match(setAction, /getCurrentCompanyContext\(\)/)
})

test("CLEAR validates identifiers and uses only the exact 0122 clear RPC identifiers", () => {
  assert.equal(clearPositionSeniorityCompetencySchema.safeParse(identifiers).success, true)
  assert.match(repository, /clear_tenant_position_seniority_competency_v1/)
  assert.match(clearAction, /repository\.clear\(companyId, profileId, competencyId\)/)
  assert.match(clearAction, /getCurrentCompanyContext\(\)/)
})

test("mutation paths never access the table directly, use legacy RPCs, or elevate authority", () => {
  for (const source of [repository, setAction, clearAction, editor]) {
    assert.doesNotMatch(source, /\.from\("position_seniority_competencies"\)/)
    assert.doesNotMatch(source, /position_competencies|createBrowserClient|service_role/)
  }
})

test("successful commands revalidate Position detail for authoritative reread", () => {
  for (const action of [setAction, clearAction]) {
    assert.match(action, /revalidatePath\(`\/app\/company\/positions\/\$\{positionId\}`\)/)
  }
  assert.doesNotMatch(editor, /override\s*\?\?\s*base/i)
  assert.doesNotMatch(section, /override\s*\?\?\s*base/i)
})

test("editor reuses canonical options and explains state-specific save semantics", () => {
  assert.match(editor, /competencies\/constants\/competency-scale/)
  assert.match(editor, /PROFICIENCY_LABELS/)
  assert.match(editor, /WEIGHT_LABELS/)
  assert.match(editor, /COMPETENCY_TYPE_LABELS/)
  assert.doesNotMatch(editor, /Intermediário/)
  assert.match(editor, /Salvar cria uma expectativa específica completa/)
  assert.match(editor, /valores herdados da Base/)
  assert.match(editor, /canClear = cell\.state === "base" \|\| cell\.state === "override"/)
})

test("clear copy distinguishes Base removal from specific personalization", () => {
  assert.match(editor, /Remover somente a expectativa Base\?/)
  assert.match(editor, /Expectativas específicas das senioridades não serão removidas/)
  assert.match(editor, /Remover personalização/)
  assert.match(editor, /herdará a Base quando houver uma/)
})
