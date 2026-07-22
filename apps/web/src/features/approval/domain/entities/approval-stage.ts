import {
  ApprovalAssignment,
  type RestoreApprovalAssignmentInput,
} from "./approval-assignment"
import {
  ApprovalDecision,
  type CreateApprovalDecisionInput,
} from "./approval-decision"
import {
  assertApprovalDomain,
} from "../errors"
import type {
  ApprovalStageStatus,
} from "../types"
import type {
  ApprovalActor,
  ApprovalDecisionRule,
  ApprovalPlanStageSnapshot,
} from "../value-objects"
import {
  requireText,
  requireValidDate,
} from "../value-objects/shared"

type ApprovalStageProps = {
  id: string
  sequence: number
  name: string
  decisionRule: ApprovalDecisionRule
  status: ApprovalStageStatus
  assignments: ApprovalAssignment[]
  startedAt: Date | null
  completedAt: Date | null
}

export type CreateApprovalStageInput = {
  snapshot: ApprovalPlanStageSnapshot
  requestedAt: Date
  active: boolean
}

export type RestoreApprovalStageInput = Omit<
  ApprovalStageProps,
  "assignments"
> & {
  assignments: RestoreApprovalAssignmentInput[]
}

export type RecordApprovalStageDecisionInput = Omit<
  CreateApprovalDecisionInput,
  "stageId"
> & {
  actor: ApprovalActor
}

export class ApprovalStage {
  private constructor(
    private readonly props: ApprovalStageProps
  ) {}

  static create(
    input: CreateApprovalStageInput
  ): ApprovalStage {
    const requestedAt = requireValidDate(
      input.requestedAt,
      "requestedAt"
    )

    return new ApprovalStage({
      id: input.snapshot.stageId,
      sequence: input.snapshot.sequence,
      name: input.snapshot.name,
      decisionRule: input.snapshot.decisionRule,
      status: input.active ? "active" : "waiting",
      assignments: input.snapshot.assignments.map(
        (assignment) =>
          ApprovalAssignment.create({
            id: assignment.assignmentId,
            stageId: input.snapshot.stageId,
            principal: assignment.principal,
            assignedAt: requestedAt,
          })
      ),
      startedAt: input.active ? requestedAt : null,
      completedAt: null,
    })
  }

  static restore(
    input: RestoreApprovalStageInput
  ): ApprovalStage {
    assertApprovalDomain(
      Number.isInteger(input.sequence) && input.sequence > 0,
      "invalid_input",
      "A sequência da etapa deve ser um inteiro positivo."
    )
    assertApprovalDomain(
      input.assignments.length > 0,
      "invalid_input",
      "A etapa deve possuir ao menos uma atribuição."
    )

    const id = requireText(input.id, "stageId")
    const assignments = input.assignments.map(
      ApprovalAssignment.restore
    )
    const assignmentIds = new Set(
      assignments.map((assignment) => assignment.id)
    )

    assertApprovalDomain(
      assignments.every(
        (assignment) => assignment.stageId === id
      ),
      "invalid_input",
      "Todas as atribuições devem pertencer à etapa."
    )
    assertApprovalDomain(
      assignmentIds.size === assignments.length,
      "invalid_input",
      "A etapa não pode possuir atribuições duplicadas."
    )
    assertApprovalDomain(
      input.status !== "waiting" ||
        (!input.startedAt && !input.completedAt),
      "invalid_input",
      "Uma etapa aguardando não pode possuir datas de execução."
    )
    assertApprovalDomain(
      input.status !== "active" ||
        (Boolean(input.startedAt) && !input.completedAt),
      "invalid_input",
      "Uma etapa ativa deve possuir apenas startedAt."
    )
    assertApprovalDomain(
      !["approved", "rejected", "cancelled", "skipped"].includes(
        input.status
      ) || Boolean(input.completedAt),
      "invalid_input",
      "Uma etapa concluída deve possuir completedAt."
    )

    return new ApprovalStage({
      id,
      sequence: input.sequence,
      name: requireText(input.name, "stage.name"),
      decisionRule: input.decisionRule,
      status: input.status,
      assignments,
      startedAt: input.startedAt
        ? requireValidDate(input.startedAt, "startedAt")
        : null,
      completedAt: input.completedAt
        ? requireValidDate(input.completedAt, "completedAt")
        : null,
    })
  }

  get id() {
    return this.props.id
  }

  get sequence() {
    return this.props.sequence
  }

  get name() {
    return this.props.name
  }

  get decisionRule() {
    return this.props.decisionRule
  }

  get status() {
    return this.props.status
  }

  get assignments(): readonly ApprovalAssignment[] {
    return [...this.props.assignments]
  }

  get startedAt() {
    return this.props.startedAt
      ? new Date(this.props.startedAt.getTime())
      : null
  }

  get completedAt() {
    return this.props.completedAt
      ? new Date(this.props.completedAt.getTime())
      : null
  }

  activate(startedAt: Date): void {
    assertApprovalDomain(
      this.props.status === "waiting",
      "invalid_transition",
      "Somente etapas aguardando podem ser ativadas.",
      { stageId: this.id, status: this.status }
    )

    this.props.status = "active"
    this.props.startedAt = requireValidDate(
      startedAt,
      "startedAt"
    )
  }

  recordDecision(
    input: RecordApprovalStageDecisionInput
  ): ApprovalDecision {
    assertApprovalDomain(
      this.props.status === "active",
      "stage_not_active",
      "A etapa não está ativa para receber decisões.",
      { stageId: this.id, status: this.status }
    )

    const assignment = this.props.assignments.find(
      (item) => item.id === input.assignmentId
    )

    assertApprovalDomain(
      assignment,
      "assignment_not_found",
      "A atribuição não pertence à etapa ativa.",
      { stageId: this.id, assignmentId: input.assignmentId }
    )
    assertApprovalDomain(
      assignment.status === "assigned",
      assignment.status === "decided"
        ? "duplicate_decision"
        : "assignment_not_active",
      "A atribuição não está disponível para decisão.",
      { assignmentId: assignment.id, status: assignment.status }
    )
    assertApprovalDomain(
      assignment.isAssignedTo(input.actor),
      "actor_not_assigned",
      "O ator não está autorizado a decidir por esta atribuição.",
      { assignmentId: assignment.id }
    )

    const decision = ApprovalDecision.create({
      ...input,
      stageId: this.id,
    })

    assignment.markDecided(input.decidedAt)
    this.props.status =
      input.outcome === "approved"
        ? "approved"
        : "rejected"
    this.props.completedAt = requireValidDate(
      input.decidedAt,
      "decidedAt"
    )

    this.revokeOpenAssignments(input.decidedAt)

    return decision
  }

  cancel(cancelledAt: Date): void {
    if (
      this.props.status !== "waiting" &&
      this.props.status !== "active"
    ) {
      return
    }

    this.props.status = "cancelled"
    this.props.completedAt = requireValidDate(
      cancelledAt,
      "cancelledAt"
    )
    this.revokeOpenAssignments(cancelledAt)
  }

  private revokeOpenAssignments(revokedAt: Date): void {
    this.props.assignments.forEach((assignment) =>
      assignment.revoke(revokedAt)
    )
  }
}
