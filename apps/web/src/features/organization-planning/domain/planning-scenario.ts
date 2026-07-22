import type { PlanningDomainEvent, PlanningDomainEventType } from "../events/planning-domain-event"
import { createPlanningDomainEvent } from "../events/planning-domain-event"
import { incrementVersion } from "../services/increment-version"
import {
  PLANNING_SCENARIO_STATUSES,
  type PlanningScenarioContract,
  type PlanningScenarioStatus,
} from "../types/planning-contracts"
import { assertPlanningDomain } from "./planning-domain-error"
import { requireDate, requireText, requireVersion } from "./planning-domain-support"

type CreateScenarioInput = {
  id: string
  companyId: string
  workspaceId: string
  baseSnapshotId: string
  name: string
  description?: string | null
  createdAt: Date
}

export class PlanningScenario {
  private constructor(
    private readonly props: PlanningScenarioContract,
    private readonly events: readonly PlanningDomainEvent[]
  ) {}

  static create(input: CreateScenarioInput) {
    const createdAt = requireDate(input.createdAt, "createdAt")
    const props = Object.freeze({
      id: requireText(input.id, "scenarioId"),
      companyId: requireText(input.companyId, "companyId"),
      workspaceId: requireText(input.workspaceId, "workspaceId"),
      baseSnapshotId: requireText(input.baseSnapshotId, "baseSnapshotId"),
      name: requireText(input.name, "name"),
      description: input.description?.trim() || null,
      status: "draft" as const,
      version: 1,
      createdAt,
      updatedAt: new Date(createdAt.getTime()),
    })

    return new PlanningScenario(props, [
      createPlanningDomainEvent({
        type: "planning.scenario.created",
        companyId: props.companyId,
        aggregateId: props.id,
        aggregateVersion: props.version,
        occurredAt: createdAt,
        payload: { baseSnapshotId: props.baseSnapshotId },
      }),
    ])
  }

  static restore(input: PlanningScenarioContract) {
    assertPlanningDomain(
      PLANNING_SCENARIO_STATUSES.includes(input.status),
      "invalid_input",
      "Status do cenário inválido."
    )
    const createdAt = requireDate(input.createdAt, "createdAt")
    const updatedAt = requireDate(input.updatedAt, "updatedAt")
    assertPlanningDomain(
      updatedAt.getTime() >= createdAt.getTime(),
      "invalid_input",
      "updatedAt não pode ser anterior a createdAt."
    )

    return new PlanningScenario(
      Object.freeze({
        ...input,
        id: requireText(input.id, "scenarioId"),
        companyId: requireText(input.companyId, "companyId"),
        workspaceId: requireText(input.workspaceId, "workspaceId"),
        baseSnapshotId: requireText(input.baseSnapshotId, "baseSnapshotId"),
        name: requireText(input.name, "name"),
        description: input.description?.trim() || null,
        version: requireVersion(input.version),
        createdAt,
        updatedAt,
      }),
      []
    )
  }

  get id() { return this.props.id }
  get companyId() { return this.props.companyId }
  get workspaceId() { return this.props.workspaceId }
  get baseSnapshotId() { return this.props.baseSnapshotId }
  get name() { return this.props.name }
  get description() { return this.props.description }
  get status() { return this.props.status }
  get version() { return this.props.version }
  get createdAt() { return new Date(this.props.createdAt.getTime()) }
  get updatedAt() { return new Date(this.props.updatedAt.getTime()) }
  get domainEvents() { return [...this.events] }

  updateDetails(name: string, description: string | null, occurredAt: Date) {
    assertPlanningDomain(
      this.status === "draft",
      "immutable_entity",
      "Apenas cenários em rascunho podem ser editados."
    )

    return this.copy({
      name: requireText(name, "name"),
      description: description?.trim() || null,
      version: incrementVersion(this.version),
      updatedAt: requireDate(occurredAt, "occurredAt"),
    })
  }

  submit(occurredAt: Date) {
    return this.transition("submitted", "planning.scenario.submitted", occurredAt, ["draft"])
  }

  approve(occurredAt: Date) {
    return this.transition("approved", "planning.scenario.approved", occurredAt, ["submitted"])
  }

  reject(occurredAt: Date) {
    return this.transition("rejected", "planning.scenario.rejected", occurredAt, ["submitted"])
  }

  archive(occurredAt: Date) {
    assertPlanningDomain(
      this.status !== "published",
      "immutable_entity",
      "Cenários publicados não podem ser arquivados."
    )

    return this.transition("archived", "planning.scenario.archived", occurredAt, [
      "draft", "submitted", "approved", "rejected",
    ])
  }

  publish(occurredAt: Date) {
    return this.transition("published", "planning.scenario.published", occurredAt, ["approved"])
  }

  toContract(): PlanningScenarioContract {
    return Object.freeze({
      ...this.props,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    })
  }

  private transition(
    status: PlanningScenarioStatus,
    eventType: PlanningDomainEventType,
    occurredAtInput: Date,
    allowedStatuses: readonly PlanningScenarioStatus[]
  ) {
    assertPlanningDomain(
      allowedStatuses.includes(this.status),
      "invalid_transition",
      `Transição de ${this.status} para ${status} não permitida.`
    )
    const occurredAt = requireDate(occurredAtInput, "occurredAt")
    const version = incrementVersion(this.version)

    return this.copy(
      { status, version, updatedAt: occurredAt },
      createPlanningDomainEvent({
        type: eventType,
        companyId: this.companyId,
        aggregateId: this.id,
        aggregateVersion: version,
        occurredAt,
        payload: { previousStatus: this.status, status },
      })
    )
  }

  private copy(
    changes: Partial<PlanningScenarioContract>,
    event?: PlanningDomainEvent
  ) {
    return new PlanningScenario(
      Object.freeze({ ...this.props, ...changes }),
      event ? [...this.events, event] : [...this.events]
    )
  }
}
