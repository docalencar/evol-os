import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const root = process.cwd()
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8")

test("answer save and response submit use only the trusted 0113 RPCs", () => {
  const answers = read(
    "src/features/assessments/repositories/assessment-answer-repository.ts"
  )
  const responses = read(
    "src/features/assessments/repositories/assessment-response-repository.ts"
  )
  const saveAction = read(
    "src/features/assessments/actions/save-assessment-answer-action.ts"
  )
  const submitAction = read(
    "src/features/assessments/actions/submit-assessment-response-action.ts"
  )

  assert.match(answers, /save_tenant_assessment_answer_v1/)
  assert.match(responses, /submit_tenant_assessment_response_v1/)
  assert.doesNotMatch(answers, /\.upsert\(|\.insert\(|\.update\(|\.delete\(/)
  assert.doesNotMatch(responses, /\.insert\(|\.update\(|updateStatus/)
  assert.doesNotMatch(saveAction, /loadAssessmentActor|updateStatus/)
  assert.doesNotMatch(submitAction, /getAssessmentResponsePageReadModel|updateStatus/)
})

test("trusted action results preserve stable statuses and safe public copy", () => {
  const saveAction = read(
    "src/features/assessments/actions/save-assessment-answer-action.ts"
  )
  const submitAction = read(
    "src/features/assessments/actions/submit-assessment-response-action.ts"
  )

  assert.match(saveAction, /"succeeded" \| "no_change"/)
  assert.match(saveAction, /Resposta já estava salva/)
  assert.match(saveAction, /Não foi possível salvar a resposta/)
  assert.match(submitAction, /"succeeded" \| "already_submitted"/)
  assert.match(submitAction, /ASSESSMENT_REQUIRED_ANSWERS_MISSING/)
  assert.match(submitAction, /Não foi possível enviar a avaliação/)
  assert.doesNotMatch(saveAction, /message:\s*error\.message/)
  assert.doesNotMatch(submitAction, /message:\s*error\.message\s*[,}]/)
})

test("pending, failed and dirty autosaves block submit until persistence", () => {
  const context = read(
    "src/features/assessments/components/assessment-execution/assessment-autosave-context.tsx"
  )
  const hook = read(
    "src/features/assessments/components/assessment-execution/hooks/use-assessment-auto-save.ts"
  )
  const card = read(
    "src/features/assessments/components/assessment-execution/assessment-question-card.tsx"
  )
  const footer = read(
    "src/features/assessments/components/assessment-execution/assessment-footer.tsx"
  )
  const workspace = read(
    "src/features/assessments/components/assessment-execution/assessment-execution-workspace.tsx"
  )

  assert.match(context, /hasUnpersistedChanges/)
  assert.match(context, /"pending" \| "error"/)
  assert.match(hook, /saveQueueRef/)
  assert.match(hook, /markPending\(assessmentQuestionId\)/)
  assert.match(hook, /markPersisted\(assessmentQuestionId\)/)
  assert.match(hook, /router\.refresh\(\)/)
  assert.match(card, /if \(dirty\) \{\s*markPending\(\)/)
  assert.match(footer, /disabled=\{!canSubmit \|\| hasUnpersistedChanges\}/)
  assert.match(workspace, /<AssessmentAutosaveProvider>/)
})

test("administrator remains read-only and terminal responses stay read-only", () => {
  const responsePage = read(
    "src/app/(dashboard)/app/assessments/responses/[id]/page.tsx"
  )
  const workspace = read(
    "src/features/assessments/components/assessment-execution/assessment-execution-workspace.tsx"
  )

  assert.match(responsePage, /personId === workspace\.response\.evaluator_id/)
  assert.match(workspace, /!canAnswer/)
  assert.match(workspace, /responseStatus === "submitted"/)
  assert.match(workspace, /responseStatus === "completed"/)
  assert.match(workspace, /responseStatus === "cancelled"/)
  assert.match(workspace, /!section\.active/)
  assert.match(workspace, /!question\.active/)
})

test("the unreachable legacy direct Response start path is removed", () => {
  assert.equal(
    existsSync(
      `${root}/src/features/assessments/actions/start-assessment-response-action.ts`
    ),
    false
  )

  const barrel = read("src/features/assessments/index.ts")
  const responses = read(
    "src/features/assessments/repositories/assessment-response-repository.ts"
  )

  assert.doesNotMatch(barrel, /startAssessmentResponse/)
  assert.doesNotMatch(responses, /status:\s*"in_progress"|started_at/)
})
