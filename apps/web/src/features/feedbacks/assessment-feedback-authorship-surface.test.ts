/**
 * E5-P1 — the authorship surface for assessment feedback.
 *
 * These are source-contract tests, the same shape as
 * trusted-feedback-mutation-cutover.test.ts and
 * assessment-feedback-app-integration.test.ts, because the pieces under test
 * are a server component, a `server-only` query and a `"use client"` component:
 * none can be imported into a plain node test process. What CAN be pinned, and
 * is pinned here, is every property that would let this surface drift back into
 * the shapes this slice exists to avoid — a second write path, a client-side
 * authorization decision, a legacy bridge, a success signal that outruns the
 * database.
 *
 * The decision the surface makes on its own has been extracted into a pure
 * function and is tested for real in authorship/can-initiate-assessment-feedback.test.ts.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

const page = read("../../app/(dashboard)/app/assessments/responses/[id]/page.tsx")
const starter = read("./components/assessment-response-feedback-starter.tsx")
const query = read("./queries/get-assessment-response-feedback-link.ts")
const repository = read("./repositories/feedback-thread-repository.ts")
const action = read("./actions/create-feedback-conversation-action.ts")
const eligibility = read("./authorship/can-initiate-assessment-feedback.ts")

/** Strip block and line comments: a property must hold in code, not in prose. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

test("A. the finalized response page mounts the authorship surface", () => {
  assert.match(page, /AssessmentResponseFeedbackStarter/)
  assert.match(page, /getAssessmentResponseFeedbackLink/)
  // It is rendered in the finalized branch, next to the result card — not in
  // the evaluatee branch and not in the still-answerable workspace branch.
  const finalizedBranch = page.slice(
    page.indexOf('workspace.response.status === "submitted"'),
    page.indexOf("if (!workspace)")
  )
  assert.match(finalizedBranch, /<AssessmentResponseFeedbackStarter/)
  assert.match(finalizedBranch, /assessmentResponseId=\{workspace\.response\.id\}/)
  assert.equal(
    (page.match(/<AssessmentResponseFeedbackStarter/g) ?? []).length,
    1,
    "one authorship surface, in one place"
  )
})

test("B. a blank or whitespace-only initial message cannot be submitted", () => {
  // Two independent stops: the submit control is disabled while the trimmed
  // field is empty, and the handler trims again and refuses before calling the
  // Action. Neither alone is enough — the first is bypassable, the second runs
  // after a form submit the keyboard can still trigger.
  assert.match(starter, /disabled=\{isPending \|\| initialMessage\.trim\(\)\.length === 0\}/)
  assert.match(starter, /String\(formData\.get\("initialMessage"\) \?\? ""\)\.trim\(\)/)
  assert.match(starter, /if \(!message\) \{[\s\S]*?toast\.error[\s\S]*?return/)
  // The refusal happens before the Action is ever named.
  assert.ok(
    starter.indexOf("if (!message)") <
      starter.indexOf("createFeedbackConversationAction("),
    "the empty-message guard must precede the mutation"
  )
})

test("C. creation goes through the existing Action and nothing else", () => {
  assert.match(starter, /import \{ createFeedbackConversationAction \} from "\.\.\/actions"/)
  // No second mutation path: no direct RPC, no fetch, no new action.
  const executable = code(starter)
  assert.doesNotMatch(executable, /\.rpc\(|createServerDatabase|fetch\(|createBrowserClient/)
  assert.equal(
    (executable.match(/createFeedbackConversationAction\(/g) ?? []).length,
    1,
    "exactly one call site"
  )
  // The Action still passes only the origin selector and the message; the
  // boundary derives everything else.
  assert.match(
    starter,
    /createFeedbackConversationAction\(\{\s*assessmentResponseId,\s*initialMessage: message,\s*\}\)/
  )
})

test("C. success is signalled explicitly and then re-read from the server", () => {
  assert.match(starter, /toast\.success\(result\.message\)/)
  assert.match(starter, /router\.refresh\(\)/)
  // The refresh is the durable readback: it re-runs the server component, which
  // re-queries the canonical bridge. It must happen after the success signal
  // and inside the same success path.
  const successPath = starter.slice(starter.indexOf("if (!result.success)"))
  assert.ok(
    successPath.indexOf("toast.success") < successPath.indexOf("router.refresh()"),
    "signal, then re-read"
  )
  // Persistence is never inferred from a timer.
  assert.doesNotMatch(code(starter), /setTimeout|setInterval|sleep\(|await new Promise/)
})

test("D. an existing thread offers the thread, and no way to create a second", () => {
  const existingBranch = starter.slice(
    starter.indexOf('if (link.status === "existing_formal_feedback")'),
    starter.indexOf('if (link.status === "unavailable")')
  )
  assert.match(existingBranch, /\/app\/feedbacks\/\$\{link\.threadId\}/)
  assert.doesNotMatch(existingBranch, /<EntityDialog|createFeedbackConversationAction\(|Iniciar feedback/)
  // That branch returns before any create affordance can be constructed.
  assert.ok(
    starter.indexOf('link.status === "existing_formal_feedback"') <
      starter.indexOf("<EntityDialog"),
    "the existing-thread branch must return before the composer is rendered"
  )
})

test("E. an ineligible viewer gets no create affordance at all", () => {
  assert.match(starter, /if \(!canInitiate\) \{\s*return null\s*\}/)
  assert.ok(
    starter.indexOf("if (!canInitiate)") < starter.indexOf("<EntityDialog"),
    "the eligibility gate must precede the composer"
  )
  // And the gate is a pure function the page calls, not a rule reimplemented
  // in the browser.
  assert.match(page, /canInitiateAssessmentFeedback\(\{/)
  assert.match(eligibility, /export function canInitiateAssessmentFeedback/)
})

test("F. a failed mutation cannot look like success", () => {
  assert.match(starter, /if \(!result\.success\) \{\s*toast\.error\(result\.message\)\s*return\s*\}/)
  const failurePath = starter.slice(
    starter.indexOf("if (!result.success)"),
    starter.indexOf("setInitialMessage(\"\")")
  )
  assert.doesNotMatch(failurePath, /toast\.success|router\.refresh|setOpen\(false\)/)
})

test("G. a concurrent creation resolves to the existing thread, not an error", () => {
  // The Action reports a thread that already exists as a SUCCESS carrying the
  // canonical id, so the same success path runs and the refresh reveals the
  // thread the other session created. That is the whole concurrency handling:
  // there is no second cardinality check in the browser, because the unique
  // index is the one that counts.
  assert.match(action, /status === "already_exists"/)
  assert.match(action, /threadId: result\.feedbackThreadId/)
  assert.match(starter, /router\.refresh\(\)/)
  assert.doesNotMatch(code(starter), /already_exists/)
})

test("the read model asks the canonical bridge, and only for an identifier", () => {
  assert.match(repository, /\.eq\(\s*"assessment_response_id",/)
  assert.match(repository, /\.select\("id"\)/)
  assert.match(repository, /\.eq\("company_id", companyId\)/)
  const finder = repository.slice(repository.indexOf("async findByAssessmentResponse"))
  const body = finder.slice(0, finder.indexOf("async findById"))
  // Not the legacy bridge, not the title, not an inference from participants.
  assert.doesNotMatch(code(body), /assessment_id|title|sender_employee_id|receiver_employee_id/)
})

test("absence, presence and failure are three answers, not two", () => {
  assert.match(query, /"no_formal_feedback"/)
  assert.match(query, /"existing_formal_feedback"/)
  assert.match(query, /"unavailable"/)
  // A read failure never becomes "no thread", and never takes the page down.
  // Sliced, not regex-matched: a lazy `[\s\S]*?` between the guard and the
  // verdict will happily run past the branch it was meant to pin and find the
  // right words in the NEXT branch — which is exactly how an earlier version of
  // this test stayed green while the error path was rewritten to report absence.
  const errorBranch = query.slice(
    query.indexOf("if (error) {"),
    query.indexOf("return data")
  )
  assert.ok(errorBranch.length > 0, "the error branch must exist")
  assert.match(errorBranch, /return \{ status: "unavailable" \}/)
  assert.doesNotMatch(errorBranch, /no_formal_feedback/)
  const catchBranch = query.slice(query.indexOf("} catch (error) {"))
  assert.match(catchBranch, /return \{ status: "unavailable" \}/)
  assert.doesNotMatch(catchBranch, /no_formal_feedback/)
  assert.doesNotMatch(code(query), /throw /)
  // And the surface renders all three differently.
  assert.match(starter, /link\.status === "existing_formal_feedback"/)
  assert.match(starter, /link\.status === "unavailable"/)
})

test("no new write path, no new RPC, no legacy dual-write", () => {
  const surface = code(page + starter + query + repository)
  // public.feedbacks is the retired table; nothing here may touch it.
  assert.doesNotMatch(surface, /from\("feedbacks"\)|"public\.feedbacks"/)
  // The only feedback-mutating RPC names that may appear anywhere in this slice
  // are the five the boundary already publishes, and none of them is called
  // from these files.
  assert.doesNotMatch(surface, /_v1\(/)
  assert.doesNotMatch(surface, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/)
  // Authorization is never decided here.
  assert.doesNotMatch(surface, /service_role|has_company_role|current_person_id/)
})
