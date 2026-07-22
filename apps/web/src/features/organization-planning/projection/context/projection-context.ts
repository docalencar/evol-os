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
  metrics: ProjectionMetrics
}>

export class ProjectionContext {
  private constructor(private readonly props: ProjectionContextProps) {}

  static create(
    snapshot: PublishedSnapshotContract,
    scenario: PlanningScenarioContract,
    changeSets: readonly ChangeSet[]
  ) {
    const organization = createEmptyProjectedOrganization()
    return new ProjectionContext(Object.freeze({
      snapshot,
      scenario,
      changeSets: Object.freeze([...changeSets]),
      organization,
      events: Object.freeze([]),
      warnings: Object.freeze([]),
      metrics: organization.metrics,
    }))
  }

  get snapshot() { return this.props.snapshot }
  get scenario() { return this.props.scenario }
  get changeSets() { return this.props.changeSets }
  get organization() { return this.props.organization }
  get events() { return this.props.events }
  get warnings() { return this.props.warnings }
  get metrics() { return this.props.metrics }

  withOrganization(organization: ProjectedOrganization) {
    const immutableOrganization = freezeProjectedOrganization(organization)
    return this.copy({
      organization: immutableOrganization,
      metrics: immutableOrganization.metrics,
    })
  }

  withMetrics(metrics: ProjectionMetrics) {
    return this.copy({
      metrics,
      organization: freezeProjectedOrganization({ ...this.organization, metrics }),
    })
  }

  addEvent(event: ProjectionInternalEvent) {
    return this.copy({ events: Object.freeze([...this.events, Object.freeze(event)]) })
  }

  addWarning(warning: ProjectionIssue) {
    return this.copy({ warnings: Object.freeze([...this.warnings, Object.freeze(warning)]) })
  }

  private copy(changes: Partial<ProjectionContextProps>) {
    return new ProjectionContext(Object.freeze({ ...this.props, ...changes }))
  }
}
