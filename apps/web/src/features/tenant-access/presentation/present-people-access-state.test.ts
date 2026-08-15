import assert from "node:assert/strict"
import test from "node:test"

import { presentPeopleAccessState } from "./present-people-access-state"
import type { PeopleAccessStateRow } from "../types/people-access-state"

const base: PeopleAccessStateRow = {
  personId: "79000000-0000-4000-8000-000000000001",
  membershipId: null,
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

test("membership management permissions follow actor and target roles", () => {
  const activeAdmin = {
    ...base,
    membershipId: "79000000-0000-4000-8000-000000000003",
    membershipRole: "admin" as const,
    membershipStatus: "active" as const,
  }
  const ownerView = presentPeopleAccessState(activeAdmin, "owner")
  assert.equal(ownerView.canChangeRole, true)
  assert.equal(ownerView.canDeactivate, true)
  assert.equal(ownerView.canTransferOwnership, true)
  assert.equal(ownerView.roleOptions.some((option) => option.value === "owner"), true)

  const adminView = presentPeopleAccessState(activeAdmin, "admin")
  assert.equal(adminView.canChangeRole, true)
  assert.equal(adminView.canDeactivate, true)
  assert.equal(adminView.canTransferOwnership, false)
  assert.equal(adminView.roleOptions.some((option) => option.value === "owner"), false)
})

test("owner targets and self targets preserve backend semantics", () => {
  const ownerTarget = {
    ...base,
    membershipId: "79000000-0000-4000-8000-000000000004",
    membershipRole: "owner" as const,
    membershipStatus: "active" as const,
  }
  assert.equal(presentPeopleAccessState(ownerTarget, "admin").canChangeRole, false)
  assert.equal(presentPeopleAccessState(ownerTarget, "owner").canChangeRole, true)
  assert.equal(presentPeopleAccessState(ownerTarget, "owner").canTransferOwnership, false)
  assert.equal(presentPeopleAccessState({ ...ownerTarget, membershipRole: "admin" }, "owner", true, true).canTransferOwnership, false)
})

test("membership management fails closed for missing, inactive and unavailable state", () => {
  for (const view of [
    presentPeopleAccessState(base, "owner"),
    presentPeopleAccessState({ ...base, membershipId: "79000000-0000-4000-8000-000000000005", membershipRole: "employee", membershipStatus: "inactive" }, "owner"),
    presentPeopleAccessState(null, "owner", false),
  ]) {
    assert.equal(view.canChangeRole, false)
    assert.equal(view.canDeactivate, false)
    assert.equal(view.canTransferOwnership, false)
  }
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
