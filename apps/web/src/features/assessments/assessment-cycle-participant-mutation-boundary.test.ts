import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const root = process.cwd()
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8")

test("cycle and participant writes use only the six trusted 0112 RPCs", () => {
  const cycle = read("src/features/assessments/repositories/assessment-cycle-repository.ts")
  const participants = read("src/features/assessments/repositories/assessment-cycle-participant-repository.ts")
  const responses = read("src/features/assessments/repositories/assessment-response-repository.ts")
  const combined = `${cycle}\n${participants}\n${responses}`

  for (const rpc of [
    "create_tenant_assessment_cycle_v1",
    "update_tenant_assessment_cycle_v1",
    "archive_tenant_assessment_cycle_v1",
    "add_tenant_assessment_cycle_participants_v1",
    "remove_tenant_assessment_cycle_participant_v1",
    "generate_tenant_assessment_cycle_responses_v1",
  ]) assert.match(combined, new RegExp(rpc))

  assert.doesNotMatch(cycle, /\.from\("assessment_cycles"\)[\s\S]*?\.(insert|update|delete)/)
  assert.doesNotMatch(participants, /\.from\("assessment_cycle_participants"\)[\s\S]*?\.(insert|update|delete)/)
  assert.doesNotMatch(responses, /generateSelfAssessments|\.upsert\(/)
})

test("cycle UX carries idempotency, lifecycle and dismiss-safety contracts", () => {
  const form = read("src/features/assessments/components/assessment-cycle/assessment-cycle-form.tsx")
  const createDialog = read("src/features/assessments/components/assessment-cycle/assessment-cycle-create-dialog.tsx")
  const editDialog = read("src/features/assessments/components/assessment-cycle/assessment-cycle-edit-dialog.tsx")
  const generation = read("src/features/assessments/actions/generate-cycle-assessments-action.ts")

  assert.match(form, /newSubmissionId\(\)/)
  assert.match(form, /scheduled: \["scheduled", "draft", "active", "cancelled"\]/)
  assert.match(form, /active: \["active", "completed", "cancelled"\]/)
  assert.match(createDialog, /dismissible=\{false\}/)
  assert.match(editDialog, /dismissible=\{false\}/)
  assert.match(generation, /ASSESSMENT_PEER_SELECTION_NOT_SUPPORTED/)
  assert.match(generation, /Nenhuma nova avaliação foi criada/)
  assert.doesNotMatch(generation, /findByCycle|assessmentTemplateId/)
})

test("participant dialog is viewport-safe and preserves no-op semantics", () => {
  const dialog = read("src/features/assessments/components/assessment-cycle/add-participants-dialog.tsx")
  const action = read("src/features/assessments/actions/add-cycle-participants-action.ts")

  assert.match(dialog, /<EntityDialog/)
  assert.match(dialog, /dismissible=\{false\}/)
  assert.match(dialog, /max-h-\[92dvh\].*bg-white/)
  assert.match(dialog, /min-h-0 flex-1.*overflow-y-auto/)
  assert.match(dialog, /shrink-0.*border-t.*bg-white/)
  assert.match(dialog, /toast\.success\(result\.message\)/)
  assert.doesNotMatch(dialog, /fixed inset-0 z-50/)

  assert.match(action, /addedParticipantCount/)
  assert.match(action, /if \(addedParticipantCount > 0\) \{\s*revalidatePath/)
  assert.match(action, /Os participantes selecionados já fazem parte do ciclo/)
})

test("administrative response views are read-only while evaluators can answer", () => {
  const responsePage = read("src/app/(dashboard)/app/assessments/responses/[id]/page.tsx")
  const cyclePage = read("src/app/(dashboard)/app/assessments/cycles/[id]/page.tsx")
  const workspace = read("src/features/assessments/components/assessment-execution/assessment-execution-workspace.tsx")
  const card = read("src/features/assessments/components/assessment-execution/assessment-question-card.tsx")
  const autosave = read("src/features/assessments/components/assessment-execution/hooks/use-assessment-auto-save.ts")

  assert.match(responsePage, /personId === workspace\.response\.evaluator_id/)
  assert.match(workspace, /!canAnswer/)
  assert.match(workspace, /Visualização administrativa/)
  assert.match(workspace, /Somente o avaliador designado pode responder/)
  assert.match(card, /readOnly \? \(\s*<ReadOnlyAssessmentQuestionCard/)
  assert.doesNotMatch(card.match(/function ReadOnlyAssessmentQuestionCard[\s\S]*?function EditableAssessmentQuestionCard/)?.[0] ?? "", /useAssessmentAutoSave/)
  assert.match(cyclePage, /response\.evaluator\?\.id === personId[\s\S]*?"Responder"[\s\S]*?: "Abrir"/)
  assert.match(autosave, /result\.success \? null : result\.message/)
})
