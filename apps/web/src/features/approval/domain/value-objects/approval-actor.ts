import {
  assertApprovalDomain,
} from "../errors/approval-domain-error"
import {
  optionalText,
  requireText,
} from "./shared"

export const APPROVAL_ACTOR_TYPES = [
  "user",
  "system",
  "automation",
  "integration",
] as const

export type ApprovalActorType =
  (typeof APPROVAL_ACTOR_TYPES)[number]

export type ApprovalActor = Readonly<{
  actorType: ApprovalActorType
  actorId: string | null
  personId: string | null
  displayNameSnapshot: string | null
}>

export type CreateApprovalActorInput = {
  actorType: ApprovalActorType
  actorId?: string | null
  personId?: string | null
  displayNameSnapshot?: string | null
}

export function createApprovalActor(
  input: CreateApprovalActorInput
): ApprovalActor {
  const actorId = optionalText(input.actorId)
  const personId = optionalText(input.personId)

  assertApprovalDomain(
    input.actorType !== "user" || Boolean(actorId),
    "invalid_input",
    "actorId é obrigatório para atores do tipo user.",
    { field: "actorId" }
  )

  return Object.freeze({
    actorType: input.actorType,
    actorId,
    personId,
    displayNameSnapshot: optionalText(
      input.displayNameSnapshot
    ),
  })
}

export function isSameApprovalActor(
  left: ApprovalActor,
  right: ApprovalActor
): boolean {
  if (
    left.actorType === "user" &&
    right.actorType === "user"
  ) {
    return left.actorId === right.actorId
  }

  return (
    left.actorType === right.actorType &&
    left.actorId === right.actorId &&
    left.personId === right.personId
  )
}

export function requireApprovalActorId(
  actor: ApprovalActor
): string {
  return requireText(
    actor.actorId ?? "",
    "actor.actorId"
  )
}
