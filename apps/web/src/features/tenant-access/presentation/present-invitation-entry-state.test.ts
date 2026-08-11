import assert from "node:assert/strict"
import test from "node:test"

import { presentInvitationEntryState } from "./present-invitation-entry-state"

test("invalid token format yields invalid state regardless of session", () => {
  assert.equal(
    presentInvitationEntryState({ tokenFormatValid: false, isAuthenticated: false }),
    "invalid",
  )
  assert.equal(
    presentInvitationEntryState({ tokenFormatValid: false, isAuthenticated: true }),
    "invalid",
  )
})

test("valid token without a session requires authentication", () => {
  assert.equal(
    presentInvitationEntryState({ tokenFormatValid: true, isAuthenticated: false }),
    "authentication_required",
  )
})

test("valid token with an authenticated session is ready", () => {
  assert.equal(
    presentInvitationEntryState({ tokenFormatValid: true, isAuthenticated: true }),
    "authenticated_ready",
  )
})
