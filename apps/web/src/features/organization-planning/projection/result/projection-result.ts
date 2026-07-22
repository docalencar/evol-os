import type {
  ProjectedOrganization,
  ProjectionIssue,
  ProjectionMetrics,
} from "../contracts"

export class ProjectionResult {
  private constructor(
    readonly organization: ProjectedOrganization,
    readonly warnings: readonly ProjectionIssue[],
    readonly errors: readonly ProjectionIssue[],
    readonly metrics: ProjectionMetrics
  ) {
    Object.freeze(this)
  }

  static create(input: {
    organization: ProjectedOrganization
    warnings?: readonly ProjectionIssue[]
    errors?: readonly ProjectionIssue[]
  }) {
    return new ProjectionResult(
      input.organization,
      Object.freeze([...(input.warnings ?? [])]),
      Object.freeze([...(input.errors ?? [])]),
      input.organization.metrics
    )
  }

  get isValid() { return this.errors.length === 0 }
}
