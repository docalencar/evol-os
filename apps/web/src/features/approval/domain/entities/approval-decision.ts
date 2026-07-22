import {
  assertApprovalDomain,
} from "../errors"
import type {
  ApprovalDecisionOutcome,
} from "../types"
import {
  createApprovalActor,
  type ApprovalActor,
} from "../value-objects"
import {
  optionalText,
  requireText,
  requireValidDate,
} from "../value-objects/shared"

type ApprovalDecisionProps = {
  id: string
  approvalRequestId: string
  stageId: string
  assignmentId: string
  actor: ApprovalActor
  outcome: ApprovalDecisionOutcome
  comment: string | null
  decidedAt: Date
  subjectVersion: string
  requestVersion: number
  idempotencyKey: string
}

export type CreateApprovalDecisionInput =
  ApprovalDecisionProps

export class ApprovalDecision {
  private constructor(
    private readonly props: ApprovalDecisionProps
  ) {}

  static create(
    input: CreateApprovalDecisionInput
  ): ApprovalDecision {
    const comment = optionalText(input.comment)

    assertApprovalDomain(
      input.outcome !== "rejected" || Boolean(comment),
      "reason_required",
      "Uma rejeição deve possuir justificativa."
    )
    assertApprovalDomain(
      Number.isInteger(input.requestVersion) &&
        input.requestVersion > 0,
      "invalid_input",
      "requestVersion deve ser um inteiro positivo."
    )

    return new ApprovalDecision({
      id: requireText(input.id, "decisionId"),
      approvalRequestId: requireText(
        input.approvalRequestId,
        "approvalRequestId"
      ),
      stageId: requireText(input.stageId, "stageId"),
      assignmentId: requireText(
        input.assignmentId,
        "assignmentId"
      ),
      actor: createApprovalActor(input.actor),
      outcome: input.outcome,
      comment,
      decidedAt: requireValidDate(
        input.decidedAt,
        "decidedAt"
      ),
      subjectVersion: requireText(
        input.subjectVersion,
        "subjectVersion"
      ),
      requestVersion: input.requestVersion,
      idempotencyKey: requireText(
        input.idempotencyKey,
        "idempotencyKey"
      ),
    })
  }

  get id() {
    return this.props.id
  }

  get approvalRequestId() {
    return this.props.approvalRequestId
  }

  get stageId() {
    return this.props.stageId
  }

  get assignmentId() {
    return this.props.assignmentId
  }

  get actor() {
    return this.props.actor
  }

  get outcome() {
    return this.props.outcome
  }

  get comment() {
    return this.props.comment
  }

  get decidedAt() {
    return new Date(this.props.decidedAt.getTime())
  }

  get subjectVersion() {
    return this.props.subjectVersion
  }

  get requestVersion() {
    return this.props.requestVersion
  }

  get idempotencyKey() {
    return this.props.idempotencyKey
  }
}
