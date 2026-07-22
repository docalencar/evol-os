import {
  optionalText,
  requireText,
} from "./shared"
import type {
  ApprovalActor,
} from "./approval-actor"

export const APPROVAL_PRINCIPAL_TYPES = [
  "user",
  "person",
] as const

export type ApprovalPrincipalType =
  (typeof APPROVAL_PRINCIPAL_TYPES)[number]

export type ApprovalPrincipal = Readonly<{
  principalType: ApprovalPrincipalType
  principalId: string
  displayNameSnapshot: string | null
}>

export type CreateApprovalPrincipalInput = {
  principalType: ApprovalPrincipalType
  principalId: string
  displayNameSnapshot?: string | null
}

export function createApprovalPrincipal(
  input: CreateApprovalPrincipalInput
): ApprovalPrincipal {
  return Object.freeze({
    principalType: input.principalType,
    principalId: requireText(
      input.principalId,
      "principalId"
    ),
    displayNameSnapshot: optionalText(
      input.displayNameSnapshot
    ),
  })
}

export function approvalPrincipalMatchesActor(
  principal: ApprovalPrincipal,
  actor: ApprovalActor
): boolean {
  if (principal.principalType === "user") {
    return principal.principalId === actor.actorId
  }

  return principal.principalId === actor.personId
}
