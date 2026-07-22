import {
  ApprovalDecision,
} from "./approval-decision"
import {
  ApprovalStage,
  type RestoreApprovalStageInput,
} from "./approval-stage"
import {
  assertApprovalDomain,
} from "../errors"
import {
  createApprovalDomainEvent,
  type ApprovalDomainEvent,
  type ApprovalDomainEventType,
} from "../events"
import type {
  ApprovalDecisionOutcome,
  ApprovalRequestStatus,
} from "../types"
import {
  createApprovalActor,
  createApprovalContext,
  createApprovalPlanSnapshot,
  createApprovalSubjectRef,
  isSameApprovalActor,
  type ApprovalActor,
  type ApprovalContext,
  type ApprovalContextValue,
  type ApprovalPlanSnapshot,
  type ApprovalSubjectRef,
} from "../value-objects"
import {
  requireText,
  requireValidDate,
} from "../value-objects/shared"

type ApprovalRequestProps = {
  id: string
  subject: ApprovalSubjectRef
  requester: ApprovalActor
  context: ApprovalContext
  planSnapshot: ApprovalPlanSnapshot
  status: ApprovalRequestStatus
  stages: ApprovalStage[]
  decisions: ApprovalDecision[]
  requestedAt: Date
  expiresAt: Date | null
  completedAt: Date | null
  version: number
  idempotencyKey: string
  correlationId: string | null
  supersedesRequestId: string | null
}

export type RequestApprovalInput = {
  id: string
  subject: ApprovalSubjectRef
  requester: ApprovalActor
  context: ApprovalContext
  planSnapshot: ApprovalPlanSnapshot
  requestedAt: Date
  expiresAt?: Date | null
  idempotencyKey: string
  correlationId?: string | null
  supersedesRequestId?: string | null
}

export type RestoreApprovalRequestInput = Omit<
  ApprovalRequestProps,
  "stages" | "decisions"
> & {
  stages: RestoreApprovalStageInput[]
  decisions: ApprovalDecision[]
}

export type DecideApprovalInput = {
  decisionId: string
  assignmentId: string
  actor: ApprovalActor
  outcome: ApprovalDecisionOutcome
  comment?: string | null
  decidedAt: Date
  subjectVersion: string
  expectedVersion: number
  idempotencyKey: string
}

export type FinishApprovalInput = {
  actor: ApprovalActor
  reason: string
  occurredAt: Date
  expectedVersion: number
}

function copyApprovalPlanSnapshot(
  snapshot: ApprovalPlanSnapshot
): ApprovalPlanSnapshot {
  return createApprovalPlanSnapshot({
    policyId: snapshot.policyId,
    policyVersion: snapshot.policyVersion,
    stages: snapshot.stages.map((stage) => ({
      ...stage,
      assignments: stage.assignments.map((assignment) => ({
        ...assignment,
      })),
    })),
  })
}

export class ApprovalRequest {
  private readonly domainEvents: ApprovalDomainEvent[] = []

  private constructor(
    private readonly props: ApprovalRequestProps
  ) {}

  static request(input: RequestApprovalInput): ApprovalRequest {
    const requestedAt = requireValidDate(
      input.requestedAt,
      "requestedAt"
    )
    const expiresAt = input.expiresAt
      ? requireValidDate(input.expiresAt, "expiresAt")
      : null

    assertApprovalDomain(
      !expiresAt || expiresAt.getTime() > requestedAt.getTime(),
      "invalid_input",
      "expiresAt deve ser posterior a requestedAt."
    )

    const subject = createApprovalSubjectRef(input.subject)
    const requester = createApprovalActor(input.requester)
    const context = createApprovalContext(input.context)
    const planSnapshot = copyApprovalPlanSnapshot(
      input.planSnapshot
    )
    const stages = planSnapshot.stages.map((stage, index) =>
      ApprovalStage.create({
        snapshot: stage,
        requestedAt,
        active: index === 0,
      })
    )

    const request = new ApprovalRequest({
      id: requireText(input.id, "approvalRequestId"),
      subject,
      requester,
      context,
      planSnapshot,
      status: "pending",
      stages,
      decisions: [],
      requestedAt,
      expiresAt,
      completedAt: null,
      version: 1,
      idempotencyKey: requireText(
        input.idempotencyKey,
        "idempotencyKey"
      ),
      correlationId: input.correlationId?.trim() || null,
      supersedesRequestId:
        input.supersedesRequestId?.trim() || null,
    })

    assertApprovalDomain(
      request.supersedesRequestId !== request.id,
      "invalid_input",
      "Uma solicitação não pode substituir a si mesma."
    )

    request.raiseEvent(
      "approval.requested",
      requester,
      requestedAt,
      {
        module: subject.module,
        entityType: subject.entityType,
        entityId: subject.entityId,
        entityVersion: subject.entityVersion,
      }
    )
    request.raiseStageActivatedEvents(
      stages[0],
      requester,
      requestedAt
    )

    return request
  }

  static restore(
    input: RestoreApprovalRequestInput
  ): ApprovalRequest {
    assertApprovalDomain(
      Number.isInteger(input.version) && input.version > 0,
      "invalid_input",
      "A versão da solicitação deve ser um inteiro positivo."
    )
    assertApprovalDomain(
      input.stages.length > 0,
      "invalid_input",
      "A solicitação deve possuir ao menos uma etapa."
    )

    const planSnapshot = copyApprovalPlanSnapshot(
      input.planSnapshot
    )
    const stages = input.stages.map(ApprovalStage.restore)
    const request = new ApprovalRequest({
      ...input,
      id: requireText(input.id, "approvalRequestId"),
      subject: createApprovalSubjectRef(input.subject),
      requester: createApprovalActor(input.requester),
      context: createApprovalContext(input.context),
      planSnapshot,
      requestedAt: requireValidDate(
        input.requestedAt,
        "requestedAt"
      ),
      expiresAt: input.expiresAt
        ? requireValidDate(input.expiresAt, "expiresAt")
        : null,
      completedAt: input.completedAt
        ? requireValidDate(input.completedAt, "completedAt")
        : null,
      idempotencyKey: requireText(
        input.idempotencyKey,
        "idempotencyKey"
      ),
      stages,
      decisions: [...input.decisions],
    })

    request.assertRestoredState()
    return request
  }

  get id() {
    return this.props.id
  }

  get companyId() {
    return this.props.subject.companyId
  }

  get subject() {
    return this.props.subject
  }

  get requester() {
    return this.props.requester
  }

  get context() {
    return this.props.context
  }

  get planSnapshot() {
    return this.props.planSnapshot
  }

  get status() {
    return this.props.status
  }

  get stages(): readonly ApprovalStage[] {
    return [...this.props.stages]
  }

  get decisions(): readonly ApprovalDecision[] {
    return [...this.props.decisions]
  }

  get requestedAt() {
    return new Date(this.props.requestedAt.getTime())
  }

  get expiresAt() {
    return this.props.expiresAt
      ? new Date(this.props.expiresAt.getTime())
      : null
  }

  get completedAt() {
    return this.props.completedAt
      ? new Date(this.props.completedAt.getTime())
      : null
  }

  get version() {
    return this.props.version
  }

  get idempotencyKey() {
    return this.props.idempotencyKey
  }

  get correlationId() {
    return this.props.correlationId
  }

  get supersedesRequestId() {
    return this.props.supersedesRequestId
  }

  decide(input: DecideApprovalInput): ApprovalDecision {
    this.assertPending()
    this.assertExpectedVersion(input.expectedVersion)
    this.assertOccurredAfterRequest(input.decidedAt)
    assertApprovalDomain(
      !this.props.expiresAt ||
        input.decidedAt.getTime() <
          this.props.expiresAt.getTime(),
      "request_expired",
      "A solicitação expirou e não pode mais receber decisões."
    )
    assertApprovalDomain(
      input.subjectVersion === this.subject.entityVersion,
      "subject_version_mismatch",
      "A versão submetida não corresponde à solicitação.",
      {
        expected: this.subject.entityVersion,
        received: input.subjectVersion,
      }
    )
    assertApprovalDomain(
      !this.props.decisions.some(
        (decision) =>
          decision.idempotencyKey === input.idempotencyKey ||
          decision.id === input.decisionId
      ),
      "duplicate_decision",
      "A decisão já foi registrada."
    )

    const activeStage = this.props.stages.find(
      (stage) => stage.status === "active"
    )

    assertApprovalDomain(
      activeStage,
      "stage_not_active",
      "A solicitação não possui uma etapa ativa."
    )

    const nextVersion = this.props.version + 1
    const decision = activeStage.recordDecision({
      id: input.decisionId,
      approvalRequestId: this.id,
      assignmentId: input.assignmentId,
      actor: input.actor,
      outcome: input.outcome,
      comment: input.comment ?? null,
      decidedAt: input.decidedAt,
      subjectVersion: input.subjectVersion,
      requestVersion: nextVersion,
      idempotencyKey: input.idempotencyKey,
    })

    this.props.decisions.push(decision)
    this.props.version = nextVersion

    this.raiseEvent(
      "approval.decision.recorded",
      input.actor,
      input.decidedAt,
      {
        decisionId: decision.id,
        stageId: decision.stageId,
        assignmentId: decision.assignmentId,
        outcome: decision.outcome,
      }
    )

    if (decision.outcome === "rejected") {
      this.finish(
        "rejected",
        input.actor,
        input.decidedAt,
        "approval.rejected"
      )
      return decision
    }

    const nextStage = this.props.stages.find(
      (stage) => stage.status === "waiting"
    )

    if (nextStage) {
      nextStage.activate(input.decidedAt)
      this.raiseStageActivatedEvents(
        nextStage,
        input.actor,
        input.decidedAt
      )
      return decision
    }

    this.finish(
      "approved",
      input.actor,
      input.decidedAt,
      "approval.approved"
    )

    return decision
  }

  withdraw(input: FinishApprovalInput): void {
    this.assertPending()
    this.assertExpectedVersion(input.expectedVersion)
    this.assertReason(input.reason)
    this.assertOccurredAfterRequest(input.occurredAt)
    assertApprovalDomain(
      isSameApprovalActor(input.actor, this.requester),
      "actor_not_requester",
      "Somente o solicitante pode retirar a aprovação."
    )

    this.props.version += 1
    this.finish(
      "withdrawn",
      input.actor,
      input.occurredAt,
      "approval.withdrawn",
      input.reason
    )
  }

  cancel(input: FinishApprovalInput): void {
    this.assertPending()
    this.assertExpectedVersion(input.expectedVersion)
    this.assertReason(input.reason)
    this.assertOccurredAfterRequest(input.occurredAt)

    this.props.version += 1
    this.finish(
      "cancelled",
      input.actor,
      input.occurredAt,
      "approval.cancelled",
      input.reason
    )
  }

  expire(input: Omit<FinishApprovalInput, "reason">): void {
    this.assertPending()
    this.assertExpectedVersion(input.expectedVersion)
    this.assertOccurredAfterRequest(input.occurredAt)
    assertApprovalDomain(
      input.actor.actorType === "system" ||
        input.actor.actorType === "automation",
      "invalid_transition",
      "Somente system ou automation pode expirar uma solicitação."
    )
    assertApprovalDomain(
      this.props.expiresAt &&
        input.occurredAt.getTime() >=
          this.props.expiresAt.getTime(),
      "expiration_not_reached",
      "A solicitação ainda não atingiu sua data de expiração."
    )

    this.props.version += 1
    this.finish(
      "expired",
      input.actor,
      input.occurredAt,
      "approval.expired"
    )
  }

  pullDomainEvents(): ApprovalDomainEvent[] {
    return this.domainEvents.splice(0)
  }

  getPendingDomainEvents(): readonly ApprovalDomainEvent[] {
    return [...this.domainEvents]
  }

  clearPendingDomainEvents(): void {
    this.domainEvents.splice(0)
  }

  private finish(
    status: Exclude<ApprovalRequestStatus, "pending">,
    actor: ApprovalActor,
    occurredAt: Date,
    eventType: ApprovalDomainEventType,
    reason?: string
  ): void {
    this.props.status = status
    this.props.completedAt = requireValidDate(
      occurredAt,
      "completedAt"
    )
    this.props.stages.forEach((stage) =>
      stage.cancel(occurredAt)
    )
    this.raiseEvent(eventType, actor, occurredAt, {
      status,
      ...(reason ? { reason: reason.trim() } : {}),
    })
  }

  private raiseStageActivatedEvents(
    stage: ApprovalStage,
    actor: ApprovalActor,
    occurredAt: Date
  ): void {
    this.raiseEvent(
      "approval.stage.activated",
      actor,
      occurredAt,
      { stageId: stage.id, sequence: stage.sequence }
    )

    stage.assignments.forEach((assignment) => {
      this.raiseEvent(
        "approval.assigned",
        actor,
        occurredAt,
        {
          stageId: stage.id,
          assignmentId: assignment.id,
          principalType:
            assignment.principal.principalType,
          principalId:
            assignment.principal.principalId,
        }
      )
    })
  }

  private raiseEvent(
    eventType: ApprovalDomainEventType,
    actor: ApprovalActor,
    occurredAt: Date,
    payload: Record<string, ApprovalContextValue>
  ): void {
    this.domainEvents.push(
      createApprovalDomainEvent({
        aggregateId: this.id,
        companyId: this.companyId,
        eventType,
        actor,
        occurredAt,
        aggregateVersion: this.version,
        payload,
      })
    )
  }

  private assertPending(): void {
    assertApprovalDomain(
      this.props.status === "pending",
      "request_not_pending",
      "A solicitação não está pendente.",
      { status: this.status }
    )
  }

  private assertExpectedVersion(expectedVersion: number): void {
    assertApprovalDomain(
      expectedVersion === this.props.version,
      "invalid_transition",
      "A solicitação foi alterada por outra operação.",
      { expectedVersion, currentVersion: this.version }
    )
  }

  private assertReason(reason: string): void {
    assertApprovalDomain(
      reason.trim().length > 0,
      "reason_required",
      "A operação deve possuir justificativa."
    )
  }

  private assertOccurredAfterRequest(occurredAt: Date): void {
    const validDate = requireValidDate(occurredAt, "occurredAt")

    assertApprovalDomain(
      validDate.getTime() >= this.props.requestedAt.getTime(),
      "invalid_input",
      "A operação não pode ocorrer antes da solicitação."
    )
  }

  private assertRestoredState(): void {
    const activeStages = this.props.stages.filter(
      (stage) => stage.status === "active"
    )
    const stageIds = new Set(
      this.props.stages.map((stage) => stage.id)
    )
    const planStageIds = this.planSnapshot.stages.map(
      (stage) => stage.stageId
    )
    const decisionIds = new Set(
      this.props.decisions.map((decision) => decision.id)
    )
    const decisionIdempotencyKeys = new Set(
      this.props.decisions.map(
        (decision) => decision.idempotencyKey
      )
    )

    assertApprovalDomain(
      stageIds.size === this.props.stages.length,
      "invalid_input",
      "A solicitação não pode possuir etapas duplicadas."
    )
    assertApprovalDomain(
      planStageIds.length === this.props.stages.length &&
        planStageIds.every(
          (stageId, index) =>
            this.props.stages[index]?.id === stageId
        ),
      "invalid_input",
      "As etapas restauradas devem corresponder ao plano congelado."
    )
    assertApprovalDomain(
      decisionIds.size === this.props.decisions.length &&
        decisionIdempotencyKeys.size ===
          this.props.decisions.length,
      "invalid_input",
      "A solicitação não pode possuir decisões duplicadas."
    )
    assertApprovalDomain(
      this.props.decisions.every(
        (decision) =>
          decision.approvalRequestId === this.id &&
          decision.subjectVersion ===
            this.subject.entityVersion &&
          decision.requestVersion <= this.version &&
          this.props.stages.some(
            (stage) =>
              stage.id === decision.stageId &&
              stage.assignments.some(
                (assignment) =>
                  assignment.id === decision.assignmentId
              )
          )
      ),
      "invalid_input",
      "As decisões restauradas devem pertencer à solicitação e à versão submetida."
    )
    assertApprovalDomain(
      this.status !== "pending" || activeStages.length === 1,
      "invalid_input",
      "Uma solicitação pendente deve possuir exatamente uma etapa ativa."
    )
    assertApprovalDomain(
      this.status === "pending" || activeStages.length === 0,
      "invalid_input",
      "Uma solicitação concluída não pode possuir etapa ativa."
    )
    assertApprovalDomain(
      this.status !== "pending" ||
        this.props.stages.every((stage, index) => {
          const activeIndex = this.props.stages.findIndex(
            (item) => item.status === "active"
          )

          if (index < activeIndex) {
            return stage.status === "approved"
          }

          if (index === activeIndex) {
            return stage.status === "active"
          }

          return stage.status === "waiting"
        }),
      "invalid_input",
      "As etapas pendentes devem respeitar a sequência do plano."
    )
    assertApprovalDomain(
      this.status !== "approved" ||
        this.props.stages.every(
          (stage) => stage.status === "approved"
        ),
      "invalid_input",
      "Uma solicitação aprovada deve possuir todas as etapas aprovadas."
    )
    assertApprovalDomain(
      this.status !== "rejected" ||
        this.props.stages.some(
          (stage) => stage.status === "rejected"
        ),
      "invalid_input",
      "Uma solicitação rejeitada deve possuir uma etapa rejeitada."
    )
    assertApprovalDomain(
      this.status === "pending" || Boolean(this.completedAt),
      "invalid_input",
      "Uma solicitação concluída deve informar completedAt."
    )
    assertApprovalDomain(
      this.status !== "pending" || !this.completedAt,
      "invalid_input",
      "Uma solicitação pendente não pode possuir completedAt."
    )
    assertApprovalDomain(
      !this.expiresAt ||
        this.expiresAt.getTime() > this.requestedAt.getTime(),
      "invalid_input",
      "expiresAt deve ser posterior a requestedAt."
    )
    assertApprovalDomain(
      this.supersedesRequestId !== this.id,
      "invalid_input",
      "Uma solicitação não pode substituir a si mesma."
    )
  }
}
