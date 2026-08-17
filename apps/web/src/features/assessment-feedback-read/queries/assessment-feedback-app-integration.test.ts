import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const repository = read("../repositories/assessment-feedback-read-repository.ts")
const query = read("./get-assessment-feedback-read-models.ts")
const routePaths = [
  "../../../app/(dashboard)/app/assessments/page.tsx",
  "../../../app/(dashboard)/app/assessments/templates/[id]/page.tsx",
  "../../../app/(dashboard)/app/assessments/templates/[id]/preview/page.tsx",
  "../../../app/(dashboard)/app/assessments/cycles/[id]/page.tsx",
  "../../../app/(dashboard)/app/assessments/responses/[id]/page.tsx",
  "../../../app/(dashboard)/app/feedbacks/page.tsx",
  "../../../app/(dashboard)/app/feedbacks/[id]/page.tsx",
] as const
const routes = routePaths.map(read).join("\n")
const errors = [
  read("../../../app/(dashboard)/app/assessments/error.tsx"),
  read("../../../app/(dashboard)/app/feedbacks/error.tsx"),
].join("\n")
const reachableActions = [
  "../../assessments/actions/add-cycle-participants-action.ts",
  "../../assessments/actions/archive-assessment-question-action.ts",
  "../../assessments/actions/update-assessment-section-action.ts",
  "../../feedbacks/actions/acknowledge-feedback-thread-action.ts",
  "../../feedbacks/actions/archive-feedback-thread-action.ts",
  "../../feedbacks/actions/close-feedback-thread-action.ts",
  "../../feedbacks/actions/create-feedback-conversation-action.ts",
  "../../feedbacks/actions/reply-feedback-action.ts",
  "../../feedbacks/intelligence/actions/generate-feedback-ai-analysis-action.ts",
].map(read).join("\n")

test("seven navigable routes consume purpose-bound assessment and feedback read models", () => {
  for (const readModel of [
    "getAssessmentCatalogReadModel",
    "getAssessmentTemplateStructureReadModel",
    "getAssessmentCycleReadModel",
    "getAssessmentResponsePageReadModel",
    "getFeedbackDirectoryReadModel",
    "getFeedbackThreadReadModel",
  ]) assert.match(routes, new RegExp(readModel))

  assert.doesNotMatch(routes, /getEmployees|getFeedbackThreads|getFeedbackThreadById/)
  assert.doesNotMatch(routes, /getAssessmentTemplateById|getAssessmentSections|getAssessmentQuestions/)
})

test("server-only adapter has strict schemas and no protected-table fallback", () => {
  assert.match(repository + query, /import "server-only"/)
  assert.match(repository, /\.strict\(\)/)
  assert.match(repository, /safeParse\(data\)/)
  assert.doesNotMatch(repository + query, /\.from\(|createBrowserClient|service_role/)
  for (const rpc of [
    "get_tenant_assessment_catalog_v1",
    "get_tenant_assessment_template_structure_v1",
    "get_tenant_assessment_cycle_management_v1",
    "get_assessment_evaluator_workspace_v1",
    "get_current_person_feedback_threads_v1",
    "get_feedback_thread_detail_v1",
    "get_feedback_thread_messages_v1",
  ]) assert.match(repository, new RegExp(rpc))
})

test("route errors expose only stable retry copy", () => {
  assert.match(errors, /Tente novamente em instantes\./)
  assert.doesNotMatch(errors, /error\.message|PostgREST|SQLSTATE|42501/)
})

test("reachable action failures do not return raw database error messages", () => {
  assert.doesNotMatch(reachableActions, /message:\s*error\.message|\? error\.message/)
})
