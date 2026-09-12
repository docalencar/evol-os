/**
 * E5-DB1 — the application half of the boundary.
 *
 * The database can only be the sole write authority if the application stops
 * writing. These are structural assertions over executable source, which is the
 * established shape for architecture guards in this repository: they survive
 * refactors of behaviour and fail the moment a direct write, a best-effort audit
 * or an untyped error swallow comes back.
 *
 * Comments are stripped first — every file below necessarily NAMES the things it
 * no longer does, in order to explain why.
 */

import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const FEATURE = new URL("./", import.meta.url)

function executable(path: string): string {
  return readFileSync(new URL(path, FEATURE), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
    .join("\n")
}

const ACTIONS = [
  "actions/create-feedback-conversation-action.ts",
  "actions/reply-feedback-action.ts",
  "actions/acknowledge-feedback-thread-action.ts",
  "actions/close-feedback-thread-action.ts",
  "actions/archive-feedback-thread-action.ts",
] as const

const REPOSITORIES = [
  "repositories/feedback-thread-repository.ts",
  "repositories/feedback-message-repository.ts",
  "repositories/feedback-acknowledgement-repository.ts",
] as const

const FEEDBACK_TABLES = [
  "feedback_threads",
  "feedback_messages",
  "feedback_acknowledgements",
  "feedback_attachments",
  "feedback_mentions",
] as const

test("every Feedback mutation goes through the trusted boundary", () => {
  for (const action of ACTIONS) {
    const source = executable(action)
    assert.match(
      source,
      /createTrustedFeedbackMutationRepository\(\)/,
      `${action} must call the trusted repository`
    )
  }
})

test("no Feedback mutation records best-effort Activity any more", () => {
  // Audit is written inside the same SQL transaction as the mutation. A second,
  // application-side write would be both a duplicate and a company-visible leak.
  for (const action of ACTIONS) {
    assert.doesNotMatch(
      executable(action),
      /recordActivity/,
      `${action} must not write Activity from the application`
    )
  }
})

test("no application code writes the Feedback aggregate directly", () => {
  for (const path of [...ACTIONS, ...REPOSITORIES]) {
    const source = executable(path)
    for (const table of FEEDBACK_TABLES) {
      const writes = new RegExp(
        `from\\(\\s*["'\`]${table}["'\`]\\s*\\)[\\s\\S]{0,200}?\\.(insert|update|delete|upsert)\\(`
      )
      assert.doesNotMatch(source, writes, `${path} must not write ${table} directly`)
    }
  }
})

test("the Feedback repositories keep reads and have surrendered every mutation", () => {
  for (const path of REPOSITORIES) {
    const source = executable(path)
    assert.doesNotMatch(source, /\.insert\(/, `${path} must not insert`)
    assert.doesNotMatch(source, /\.update\(/, `${path} must not update`)
    assert.doesNotMatch(source, /\.delete\(/, `${path} must not delete`)
    assert.doesNotMatch(source, /\.upsert\(/, `${path} must not upsert`)
    assert.match(source, /\.select\(/, `${path} must still serve its reads`)
  }
})

test("the trusted adapter calls exactly the five approved functions", () => {
  const source = executable("repositories/trusted-feedback-mutation-repository.ts")

  for (const rpc of [
    "create_assessment_feedback_v1",
    "reply_feedback_v1",
    "acknowledge_feedback_v1",
    "close_feedback_v1",
    "archive_feedback_v1",
  ]) {
    assert.match(source, new RegExp(`"${rpc}"`), `${rpc} must be reachable`)
  }

  // Nothing else, and nothing that could smuggle a domain field past the
  // boundary: the only parameters are selectors and user text.
  const parameters = source.match(/p_[a-z_]+:/g) ?? []
  assert.deepEqual(
    [...new Set(parameters)].sort(),
    ["p_assessment_response_id:", "p_content:", "p_initial_message:", "p_thread_id:"],
    "the adapter may pass selectors and content only"
  )
  for (const forbidden of [
    "p_company_id",
    "p_sender",
    "p_receiver",
    "p_actor",
    "p_title",
    "p_status",
    "p_visibility",
    "p_type",
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden), `${forbidden} must never be sent`)
  }
})

test("results are discriminated, so an impossible shape cannot reach a caller", () => {
  const source = executable("repositories/trusted-feedback-mutation-repository.ts")

  assert.equal(
    (source.match(/z\.discriminatedUnion\("status"/g) ?? []).length,
    5,
    "each of the five mutations parses its own discriminated result"
  )
  // The hole this closes: one loose schema with every field optional, which let
  // a `created` without its message id through as `undefined`.
  assert.doesNotMatch(
    source,
    /feedbackMessageId:\s*z\.string\(\)\.uuid\(\)\.optional\(\)/,
    "the message id must not be optional on a result that always carries it"
  )
})

test("SQLSTATE is translated into typed errors, and foreign never differs from nonexistent", () => {
  const source = executable("repositories/trusted-feedback-mutation-repository.ts")

  for (const [sqlState, code] of [
    ["42501", "authentication_required"],
    ["P0002", "unavailable"],
    ["22023", "invalid_content"],
    ["55000", "invalid_transition"],
  ] as const) {
    assert.match(source, new RegExp(`case "${sqlState}":`), `${sqlState} must be mapped`)
    assert.match(source, new RegExp(`"${code}"`), `${code} must exist`)
  }

  // A PostgREST message can name a row the caller may not know exists.
  assert.doesNotMatch(source, /error\.message/, "the driver message must never propagate")
  assert.doesNotMatch(source, /error\.details|error\.hint|constraint/, "no driver internals")

  // The boundary already collapses foreign, cross-tenant, ineligible and
  // nonexistent into one SQLSTATE, and exactly one case may produce the class
  // that represents them — re-splitting it in the adapter would rebuild the
  // oracle the database went to the trouble of removing.
  assert.equal(
    (source.match(/return new TrustedFeedbackMutationError\("unavailable"\)/g) ?? []).length,
    1,
    "exactly one code path yields the unavailable class"
  )
  assert.equal(
    (source.match(/case "P0002":/g) ?? []).length,
    1,
    "the unavailable SQLSTATE is mapped once"
  )

  const messages = executable("actions/feedback-mutation-error-message.ts")
  assert.match(messages, /unavailable: "[^"]+"/, "unavailable has a single user-facing message")
  for (const action of ACTIONS) {
    assert.match(
      executable(action),
      /feedbackMutationErrorMessage\(/,
      `${action} must translate typed errors instead of inventing wording`
    )
  }
})

test("the retired direct-write services are gone and not re-exported", () => {
  for (const retired of [
    "services/open-feedback-conversation.ts",
    "services/acknowledge-feedback-thread.ts",
    "services/close-feedback-thread.ts",
    "services/archive-feedback-thread.ts",
  ]) {
    assert.equal(
      existsSync(new URL(retired, FEATURE)),
      false,
      `${retired} performed direct DML and must not come back`
    )
  }

  const barrel = executable("index.ts")
  for (const retiredExport of [
    "openFeedbackConversation",
    "acknowledgeFeedbackThread",
    "closeFeedbackThread",
    "archiveFeedbackThread",
  ]) {
    assert.doesNotMatch(
      barrel,
      new RegExp(`\\b${retiredExport}\\b`),
      `${retiredExport} must not be a public export`
    )
  }
})

test("create accepts only the origin selector and the mandatory first message", () => {
  const source = executable("actions/create-feedback-conversation-action.ts")

  // The INPUT SCHEMA is the contract surface. Reading the whole file instead
  // would flag `result.status`, which is an answer from the boundary rather
  // than a field the caller supplies.
  const schema = source.slice(
    source.indexOf("const createAssessmentFeedbackSchema"),
    source.indexOf("})", source.indexOf("const createAssessmentFeedbackSchema"))
  )

  assert.match(schema, /assessmentResponseId: z\.string\(\)\.uuid\(\)/)
  assert.match(schema, /initialMessage: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(10000\)/)
  assert.equal(
    (schema.match(/^\s+\w+:/gm) ?? []).length,
    2,
    "the create contract has exactly two caller-supplied fields"
  )
  for (const forbidden of [
    "companyId",
    "senderEmployeeId",
    "receiverEmployeeId",
    "title",
    "visibility",
    "status",
    "type",
    "metadata",
  ]) {
    assert.doesNotMatch(
      schema,
      new RegExp(forbidden),
      `create must not accept ${forbidden} from the caller`
    )
  }
})
