import assert from "node:assert/strict"
import test from "node:test"

import { presentPeopleAccessState } from "./present-people-access-state"
import type { PeopleAccessStateRow } from "../types/people-access-state"

const base: PeopleAccessStateRow = {
  personId: "79000000-0000-4000-8000-000000000001",
  membershipRole: null,
  membershipStatus: null,
  invitationId: null,
  invitationRole: null,
  invitationStatus: null,
  invitationGeneration: null,
  invitationExpiresAt: null,
}

test("membership has precedence over invitation and displays its role", () => {
  const view = presentPeopleAccessState({
    ...base,
    membershipRole: "admin",
    membershipStatus: "active",
    invitationId: "79000000-0000-4000-8000-000000000002",
    invitationRole: "employee",
    invitationStatus: "pending",
    invitationGeneration: 1,
  }, "owner")
  assert.equal(view.status, "access_active")
  assert.equal(view.roleLabel, "Admin")
  assert.equal(view.canResend, false)
})

test("presenter covers inactive, legacy invited and invitation lifecycle", () => {
  assert.equal(presentPeopleAccessState({ ...base, membershipStatus: "inactive" }, "owner").status, "access_inactive")
  assert.equal(presentPeopleAccessState({ ...base, membershipStatus: "invited" }, "owner").status, "access_pending")
  assert.equal(presentPeopleAccessState({ ...base, invitationStatus: "pending" }, "owner").status, "invitation_pending")
  assert.equal(presentPeopleAccessState({ ...base, invitationStatus: "expired" }, "owner").status, "invitation_expired")
  assert.equal(presentPeopleAccessState({ ...base, invitationStatus: "revoked" }, "owner").status, "invitation_revoked")
})

test("accepted without coherent membership and failed reads are fail-closed", () => {
  assert.equal(presentPeopleAccessState({ ...base, invitationStatus: "accepted" }, "owner").status, "unavailable")
  const unavailable = presentPeopleAccessState(null, "owner", false)
  assert.equal(unavailable.status, "unavailable")
  assert.equal(unavailable.canIssue, false)
})

test("issue and invitation operations follow lifecycle and actor authority", () => {
  assert.equal(presentPeopleAccessState(null, "owner").canIssue, true)
  assert.equal(presentPeopleAccessState({ ...base, invitationStatus: "revoked" }, "owner").canIssue, true)
  const ownerInvitation = {
    ...base,
    invitationId: "79000000-0000-4000-8000-000000000002",
    invitationRole: "owner" as const,
    invitationStatus: "pending" as const,
    invitationGeneration: 2,
  }
  assert.equal(presentPeopleAccessState(ownerInvitation, "admin").canRevoke, false)
  assert.equal(presentPeopleAccessState(ownerInvitation, "owner").canResend, true)
})
