import type {
  ChangeSet,
  PlanningScenarioContract,
  PublishedSnapshotContract,
} from "../../types/planning-contracts"
import {
  createEmptyProjectedOrganization,
  freezeProjectedOrganization,
  type ProjectedOrganization,
  type ProjectionInternalEvent,
  type ProjectionIssue,
  type ProjectionMetrics,
} from "../contracts"

type ProjectionContextProps = Readonly<{
  snapshot: PublishedSnapshotContract
  scenario: PlanningScenarioContract
  changeSets: readonly ChangeSet[]
  organization: ProjectedOrganization
  events: readonly ProjectionInternalEvent[]
  warnings: readonly ProjectionIssue[]
  errors: readonly ProjectionIssue[]
  metrics: ProjectionMetrics
}>

export class ProjectionContext {
  private constructor(
    private readonly props: ProjectionContextProps
  ) {}

  static create(
    snapshot: PublishedSnapshotContract,
    scenario: PlanningScenarioContract,
    changeSets: readonly ChangeSet[],
    initialOrganization:
      ProjectedOrganization =
      createEmptyProjectedOrganization()
  ) {
    const organization =
      freezeProjectedOrganization(
        initialOrganization
      )

    return new ProjectionContext(
      Object.freeze({
        snapshot,
        scenario,
        changeSets: Object.freeze([
          ...changeSets,
        ]),
        organization,
        events: Object.freeze([]),
        warnings: Object.freeze([]),
        errors: Object.freeze([]),
        metrics: organization.metrics,
      })
    )
  }

  get snapshot() {
    return this.props.snapshot
  }

  get scenario() {
    return this.props.scenario
  }

  get changeSets() {
    return this.props.changeSets
  }

  get organization() {
    return this.props.organization
  }

  get events() {
    return this.props.events
  }

  get warnings() {
    return this.props.warnings
  }

  get errors() {
    return this.props.errors
  }

  get metrics() {
    return this.props.metrics
  }

  withOrganization(
    organization: ProjectedOrganization
  ) {
    const immutableOrganization =
      freezeProjectedOrganization(organization)

    return this.copy({
      organization: immutableOrganization,
      metrics: immutableOrganization.metrics,
    })
  }

  withMetrics(metrics: ProjectionMetrics) {
    const immutableMetrics = Object.freeze({
      ...metrics,
    })

    return this.copy({
      metrics: immutableMetrics,
      organization:
        freezeProjectedOrganization({
          ...this.organization,
          metrics: immutableMetrics,
        }),
    })
  }

  addEvent(event: ProjectionInternalEvent) {
    return this.copy({
      events: Object.freeze([
        ...this.events,
        freezeProjectionEvent(event),
      ]),
    })
  }

  addWarning(warning: ProjectionIssue) {
    return this.copy({
      warnings: Object.freeze([
        ...this.warnings,
        Object.freeze({
          ...warning,
        }),
      ]),
    })
  }

  addError(error: ProjectionIssue) {
    return this.copy({
      errors: Object.freeze([
        ...this.errors,
        Object.freeze({
          ...error,
        }),
      ]),
    })
  }

  private copy(
    changes: Partial<ProjectionContextProps>
  ) {
    return new ProjectionContext(
      Object.freeze({
        ...this.props,
        ...changes,
      })
    )
  }
}

function freezeProjectionEvent(
  event: ProjectionInternalEvent
): ProjectionInternalEvent {
  if (event.type === "department.updated") {
    return Object.freeze({
      ...event,
      changedFields: Object.freeze([
        ...event.changedFields,
      ]),
    })
  }

  if (event.type === "team.updated") {
    return Object.freeze({
      ...event,
      changedFields: Object.freeze([
        ...event.changedFields,
      ]),
    })
  }

  if (event.type === "position.updated") {
    return Object.freeze({
      ...event,
      changedFields: Object.freeze([
        ...event.changedFields,
      ]),
    })
  }

  if (event.type === "employee.updated") {
    return Object.freeze({
      ...event,
      changedFields: Object.freeze([
        ...event.changedFields,
      ]),
    })
  }

  return Object.freeze({
    ...event,
  })
}
