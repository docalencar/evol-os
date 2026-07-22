import {
  assertApprovalDomain,
} from "../errors"
import type {
  ApprovalAssignmentStatus,
} from "../types"
import {
  approvalPrincipalMatchesActor,
  createApprovalPrincipal,
  type ApprovalActor,
  type ApprovalPrincipal,
} from "../value-objects"
import {
  requireText,
  requireValidDate,
} from "../value-objects/shared"

type ApprovalAssignmentProps = {
  id: string
  stageId: string
  principal: ApprovalPrincipal
  status: ApprovalAssignmentStatus
  assignedAt: Date
  decidedAt: Date | null
  revokedAt: Date | null
}

export type CreateApprovalAssignmentInput = {
  id: string
  stageId: string
  principal: ApprovalPrincipal
  assignedAt: Date
}

export type RestoreApprovalAssignmentInput =
  ApprovalAssignmentProps

export class ApprovalAssignment {
  private constructor(
    private readonly props: ApprovalAssignmentProps
  ) {}

  static create(
    input: CreateApprovalAssignmentInput
  ): ApprovalAssignment {
    return ApprovalAssignment.restore({
      ...input,
      status: "assigned",
      decidedAt: null,
      revokedAt: null,
    })
  }

  static restore(
    input: RestoreApprovalAssignmentInput
  ): ApprovalAssignment {
    const decidedAt = input.decidedAt
      ? requireValidDate(input.decidedAt, "decidedAt")
      : null
    const revokedAt = input.revokedAt
      ? requireValidDate(input.revokedAt, "revokedAt")
      : null

    assertApprovalDomain(
      input.status !== "decided" || Boolean(decidedAt),
      "invalid_input",
      "Uma atribuição decidida deve informar decidedAt."
    )
    assertApprovalDomain(
      input.status !== "revoked" || Boolean(revokedAt),
      "invalid_input",
      "Uma atribuição revogada deve informar revokedAt."
    )
    assertApprovalDomain(
      input.status !== "assigned" ||
        (!decidedAt && !revokedAt),
      "invalid_input",
      "Uma atribuição ativa não pode possuir data de decisão ou revogação."
    )
    assertApprovalDomain(
      input.status !== "decided" || !revokedAt,
      "invalid_input",
      "Uma atribuição decidida não pode estar revogada."
    )
    assertApprovalDomain(
      input.status !== "revoked" || !decidedAt,
      "invalid_input",
      "Uma atribuição revogada não pode estar decidida."
    )

    return new ApprovalAssignment({
      id: requireText(input.id, "assignmentId"),
      stageId: requireText(input.stageId, "stageId"),
      principal: createApprovalPrincipal(input.principal),
      status: input.status,
      assignedAt: requireValidDate(
        input.assignedAt,
        "assignedAt"
      ),
      decidedAt,
      revokedAt,
    })
  }

  get id() {
    return this.props.id
  }

  get stageId() {
    return this.props.stageId
  }

  get principal() {
    return this.props.principal
  }

  get status() {
    return this.props.status
  }

  get assignedAt() {
    return new Date(this.props.assignedAt.getTime())
  }

  get decidedAt() {
    return this.props.decidedAt
      ? new Date(this.props.decidedAt.getTime())
      : null
  }

  get revokedAt() {
    return this.props.revokedAt
      ? new Date(this.props.revokedAt.getTime())
      : null
  }

  isAssignedTo(actor: ApprovalActor): boolean {
    return approvalPrincipalMatchesActor(
      this.props.principal,
      actor
    )
  }

  markDecided(decidedAt: Date): void {
    assertApprovalDomain(
      this.props.status === "assigned",
      "assignment_not_active",
      "A atribuição não está disponível para decisão.",
      { assignmentId: this.id, status: this.status }
    )

    this.props.status = "decided"
    this.props.decidedAt = requireValidDate(
      decidedAt,
      "decidedAt"
    )
  }

  revoke(revokedAt: Date): void {
    if (this.props.status !== "assigned") {
      return
    }

    this.props.status = "revoked"
    this.props.revokedAt = requireValidDate(
      revokedAt,
      "revokedAt"
    )
  }
}
