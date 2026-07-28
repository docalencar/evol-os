import type {
  ProjectionInternalEvent,
  ProjectedOrganization,
  ProjectionIssue,
  ProjectionMetrics,
} from "../contracts"

export class ProjectionResult {
  private constructor(
    readonly organization: ProjectedOrganization,
    readonly warnings: readonly ProjectionIssue[],
    readonly errors: readonly ProjectionIssue[],
    readonly metrics: ProjectionMetrics,
    readonly events: readonly ProjectionInternalEvent[]
  ) {
    Object.freeze(this)
  }

  static create(input: {
    organization: ProjectedOrganization
    warnings?: readonly ProjectionIssue[]
    errors?: readonly ProjectionIssue[]
    events?: readonly ProjectionInternalEvent[]
  }) {
    return new ProjectionResult(
      input.organization,
      Object.freeze([...(input.warnings ?? [])]),
      Object.freeze([...(input.errors ?? [])]),
      input.organization.metrics,
      Object.freeze([...(input.events ?? [])])
    )
  }

  get isValid() { return this.errors.length === 0 }
}
