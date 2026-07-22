import {
  INITIAL_PLANNING_SNAPSHOT_VERSION,
  type PublishedSnapshotContract,
} from "../types/planning-contracts"
import { createPlanningDomainEvent, type PlanningDomainEvent } from "../events/planning-domain-event"
import { assertPlanningDomain } from "./planning-domain-error"
import { requireDate, requireText, requireVersion } from "./planning-domain-support"

type PublishSnapshotInput = {
  id: string
  companyId: string
  workspaceId: string
  sourceScenarioId: string
  version: number
  publishedAt: Date
}

type BootstrapSnapshotInput = Omit<
  PublishSnapshotInput,
  "sourceScenarioId"
>

export class PublishedSnapshot {
  private constructor(
    private readonly props: PublishedSnapshotContract,
    private readonly events: readonly PlanningDomainEvent[]
  ) {}

  static bootstrap(input: BootstrapSnapshotInput) {
    const publishedAt = requireDate(input.publishedAt, "publishedAt")
    const version = requireVersion(input.version)
    assertInitialSnapshotVersion(version)
    const props = Object.freeze({
      id: requireText(input.id, "snapshotId"),
      companyId: requireText(input.companyId, "companyId"),
      workspaceId: requireText(input.workspaceId, "workspaceId"),
      sourceScenarioId: null,
      version,
      publishedAt,
    })

    return new PublishedSnapshot(props, [
      createPlanningDomainEvent({
        type: "planning.snapshot.published",
        companyId: props.companyId,
        aggregateId: props.id,
        aggregateVersion: props.version,
        occurredAt: publishedAt,
        payload: { bootstrap: true, sourceScenarioId: null },
      }),
    ])
  }

  static publish(input: PublishSnapshotInput) {
    const publishedAt = requireDate(input.publishedAt, "publishedAt")
    const version = requireVersion(input.version)
    assertPlanningDomain(
      version > INITIAL_PLANNING_SNAPSHOT_VERSION,
      "invalid_input",
      "Snapshots derivados devem possuir versão posterior ao snapshot inicial."
    )
    const props = Object.freeze({
      id: requireText(input.id, "snapshotId"),
      companyId: requireText(input.companyId, "companyId"),
      workspaceId: requireText(input.workspaceId, "workspaceId"),
      sourceScenarioId: requireText(input.sourceScenarioId, "sourceScenarioId"),
      version,
      publishedAt,
    })

    return new PublishedSnapshot(props, [
      createPlanningDomainEvent({
        type: "planning.snapshot.published",
        companyId: props.companyId,
        aggregateId: props.id,
        aggregateVersion: props.version,
        occurredAt: publishedAt,
        payload: { sourceScenarioId: props.sourceScenarioId },
      }),
    ])
  }

  static restore(input: PublishedSnapshotContract) {
    const version = requireVersion(input.version)
    assertPlanningDomain(
      (version === INITIAL_PLANNING_SNAPSHOT_VERSION &&
        input.sourceScenarioId === null) ||
        (version > INITIAL_PLANNING_SNAPSHOT_VERSION &&
          input.sourceScenarioId !== null),
      "invalid_input",
      "Snapshot inicial não possui cenário de origem; snapshots derivados exigem origem."
    )

    return new PublishedSnapshot(
      Object.freeze({
        ...input,
        id: requireText(input.id, "snapshotId"),
        companyId: requireText(input.companyId, "companyId"),
        workspaceId: requireText(input.workspaceId, "workspaceId"),
        sourceScenarioId: input.sourceScenarioId
          ? requireText(input.sourceScenarioId, "sourceScenarioId")
          : null,
        version,
        publishedAt: requireDate(input.publishedAt, "publishedAt"),
      }),
      []
    )
  }

  get id() { return this.props.id }
  get companyId() { return this.props.companyId }
  get workspaceId() { return this.props.workspaceId }
  get sourceScenarioId() { return this.props.sourceScenarioId }
  get version() { return this.props.version }
  get publishedAt() { return new Date(this.props.publishedAt.getTime()) }
  get domainEvents() { return [...this.events] }

  toContract(): PublishedSnapshotContract {
    return Object.freeze({ ...this.props, publishedAt: this.publishedAt })
  }
}

function assertInitialSnapshotVersion(version: number) {
  assertPlanningDomain(
    version === INITIAL_PLANNING_SNAPSHOT_VERSION,
    "invalid_input",
    `O snapshot inicial deve usar a versão ${INITIAL_PLANNING_SNAPSHOT_VERSION}.`
  )
}
