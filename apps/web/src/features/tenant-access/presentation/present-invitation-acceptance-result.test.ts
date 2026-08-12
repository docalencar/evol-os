import assert from "node:assert/strict"
import test from "node:test"

import {
  presentAcceptanceResult,
  type AcceptInvitationFormState,
} from "./present-invitation-acceptance-result"

const UNSAFE = /TENANT_|SQLSTATE|PGRST|@|[0-9a-f]{8}-[0-9a-f]{4}|digest|rawToken/i

function assertSafe(heading: string, body: string) {
  assert.doesNotMatch(heading, UNSAFE)
  assert.doesNotMatch(body, UNSAFE)
}

test("success maps to a success tone with safe copy", () => {
  const view = presentAcceptanceResult({ status: "invitation_accepted", correlationId: "c" })
  assert.equal(view.tone, "success")
  assert.match(view.heading, /aceito com sucesso/i)
  assertSafe(view.heading, view.body)
})

test("idle produces an empty non-error view", () => {
  const view = presentAcceptanceResult({ status: "idle" })
  assert.equal(view.tone, "idle")
})

const errorCases: AcceptInvitationFormState[] = [
  { status: "conflict", reason: "already_accepted", message: "x" },
  { status: "conflict", reason: "already_member", message: "x" },
  { status: "conflict", reason: "person_linked_other", message: "x" },
  { status: "conflict", message: "x" },
  { status: "denied", message: "x" },
  { status: "expired", message: "x" },
  { status: "revoked", message: "x" },
  { status: "not_found", message: "x" },
  { status: "session_expired" },
  { status: "invalid_input", message: "x" },
  { status: "failed", message: "x" },
]

for (const state of errorCases) {
  const label = "reason" in state && state.reason ? `${state.status}/${state.reason}` : state.status
  test(`${label} maps to a safe error view`, () => {
    const view = presentAcceptanceResult(state)
    assert.equal(view.tone, "error")
    assert.ok(view.body.length > 0)
    assertSafe(view.heading, view.body)
  })
}

test("person_linked_other stays neutral and does not reveal the other identity", () => {
  const view = presentAcceptanceResult({ status: "conflict", reason: "person_linked_other", message: "x" })
  assert.doesNotMatch(view.body, /vinculad|outra conta|another account/i)
})
