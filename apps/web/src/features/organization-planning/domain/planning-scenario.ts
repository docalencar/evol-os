import type { PlanningDomainEvent, PlanningDomainEventType } from "../events/planning-domain-event"
import { createPlanningDomainEvent } from "../events/planning-domain-event"
import {
  PLANNING_SCENARIO_STATUSES,
  type PlanningScenarioContract,
  type PlanningScenarioStatus,
} from "../types/planning-contracts"
import { assertPlanningDomain } from "./planning-domain-error"
import { incrementVersion, requireDate, requireText, requireVersion } from "./planning-domain-support"

type CreateScenarioInput = {
  id: string
  companyId: string
  workspaceId: string
  baseSnapshotId: string
  name: string
  description?: string | null
  createdAt: Date
}

type CreateScenarioBranchInput = Readonly<{
  id: string
  createdAt: Date
}>

type PlanningScenarioProps = Omit<
  PlanningScenarioContract,
  "parentScenarioId" | "branchDepth" | "branchPath"
> & Readonly<{
  parentScenarioId: string | null
  branchDepth: number
  branchPath: string
}>

export class PlanningScenario {
  private constructor(
    private readonly props: PlanningScenarioProps,
    private readonly events: readonly PlanningDomainEvent[]
  ) {}

  static create(input: CreateScenarioInput) {
    const createdAt = requireDate(input.createdAt, "createdAt")
    const props = Object.freeze({
      id: requireText(input.id, "scenarioId"),
      companyId: requireText(input.companyId, "companyId"),
      workspaceId: requireText(input.workspaceId, "workspaceId"),
      baseSnapshotId: requireText(input.baseSnapshotId, "baseSnapshotId"),
      parentScenarioId: null,
      branchDepth: 0,
      branchPath: requireText(input.id, "scenarioId"),
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

    const parentScenarioId = input.parentScenarioId
      ? requireText(input.parentScenarioId, "parentScenarioId")
      : null
    const branchDepth = input.branchDepth ?? 0
    const scenarioId = requireText(input.id, "scenarioId")
    const branchPath = requireText(input.branchPath ?? scenarioId, "branchPath")
    assertPlanningDomain(
      Number.isInteger(branchDepth) && branchDepth >= 0,
      "invalid_input",
      "branchDepth deve ser um inteiro não negativo."
    )
    assertPlanningDomain(
      (parentScenarioId === null && branchDepth === 0 && branchPath === scenarioId) ||
        (parentScenarioId !== null &&
          parentScenarioId !== scenarioId &&
          branchDepth > 0 &&
          branchPath.endsWith(`/${scenarioId}`) &&
          branchPath.split("/").length === branchDepth + 1),
      "invalid_input",
      "A hierarquia da branch do cenário é inválida."
    )

    return new PlanningScenario(
      Object.freeze({
        ...input,
        id: scenarioId,
        companyId: requireText(input.companyId, "companyId"),
        workspaceId: requireText(input.workspaceId, "workspaceId"),
        baseSnapshotId: requireText(input.baseSnapshotId, "baseSnapshotId"),
        parentScenarioId,
        branchDepth,
        branchPath,
        name: requireText(input.name, "name"),
        description: input.description?.trim() || null,
        version: requireVersion(input.version),
        createdAt,
        updatedAt,
      }),
      []
    )
  }

  static restorePublished(input: PlanningScenarioContract) {
    const scenario = PlanningScenario.restore(input)

    assertPlanningDomain(
      scenario.status === "published",
      "invalid_input",
      "A reconstrução da publicação exige um cenário publicado."
    )

    return new PlanningScenario(scenario.props, [
      createPlanningDomainEvent({
        type: "planning.scenario.published",
        companyId: scenario.companyId,
        aggregateId: scenario.id,
        aggregateVersion: scenario.version,
        occurredAt: scenario.updatedAt,
        payload: {
          previousStatus: "approved",
          status: "published",
        },
      }),
    ])
  }

  get id() { return this.props.id }
  get companyId() { return this.props.companyId }
  get workspaceId() { return this.props.workspaceId }
  get baseSnapshotId() { return this.props.baseSnapshotId }
  get parentScenarioId() { return this.props.parentScenarioId }
  get branchDepth() { return this.props.branchDepth }
  get branchPath() { return this.props.branchPath }
  get name() { return this.props.name }
  get description() { return this.props.description }
  get status() { return this.props.status }
  get version() { return this.props.version }
  get createdAt() { return new Date(this.props.createdAt.getTime()) }
  get updatedAt() { return new Date(this.props.updatedAt.getTime()) }
  get domainEvents() { return [...this.events] }

  createBranch(input: CreateScenarioBranchInput): PlanningScenario {
    const createdAt = requireDate(input.createdAt, "createdAt")
    const id = requireText(input.id, "scenarioId")
    const props: PlanningScenarioProps = Object.freeze({
      id,
      companyId: this.companyId,
      workspaceId: this.workspaceId,
      baseSnapshotId: this.baseSnapshotId,
      parentScenarioId: this.id,
      branchDepth: this.branchDepth + 1,
      branchPath: `${this.branchPath}/${id}`,
      name: this.name,
      description: this.description,
      status: "draft",
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
        payload: {
          baseSnapshotId: props.baseSnapshotId,
          parentScenarioId: props.parentScenarioId,
          branchDepth: props.branchDepth,
          branchPath: props.branchPath,
        },
      }),
    ])
  }

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

  rename(name: string, occurredAt: Date) {
    return this.updateDetails(name, this.description, occurredAt)
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

  restoreArchive(occurredAt: Date) {
    return this.transition("draft", "planning.scenario.restored", occurredAt, ["archived"])
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
    changes: Partial<PlanningScenarioProps>,
    event?: PlanningDomainEvent
  ) {
    return new PlanningScenario(
      Object.freeze({ ...this.props, ...changes }),
      event ? [...this.events, event] : [...this.events]
    )
  }
}
