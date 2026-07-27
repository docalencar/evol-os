import type {
  ProjectionContract,
  ProjectionStatus,
} from "../projection/contracts/projection-persistence-contract"

import {
  PROJECTION_STATUSES,
} from "../projection/contracts/projection-persistence-contract"

import {
  assertPlanningDomain,
} from "./planning-domain-error"

import {
  requireDate,
  requireText,
  requireVersion,
} from "./planning-domain-support"

export class Projection {
  private constructor(
    private readonly props: ProjectionContract
  ) {}

  static restore(
    input: ProjectionContract
  ) {
    assertPlanningDomain(
      PROJECTION_STATUSES.includes(input.status),
      "invalid_input",
      "Status da projeção inválido."
    )

    return new Projection(
      Object.freeze({
        ...input,

        id: requireText(
          input.id,
          "projectionId"
        ),

        companyId: requireText(
          input.companyId,
          "companyId"
        ),

        workspaceId: requireText(
          input.workspaceId,
          "workspaceId"
        ),

        scenarioId: requireText(
          input.scenarioId,
          "scenarioId"
        ),

        sourceSnapshotId: requireText(
          input.sourceSnapshotId,
          "sourceSnapshotId"
        ),

        version: requireVersion(
          input.version
        ),

        createdAt: requireDate(
          input.createdAt,
          "createdAt"
        ),

        updatedAt: requireDate(
          input.updatedAt,
          "updatedAt"
        ),
      })
    )
  }

  get id() {
    return this.props.id
  }

  get companyId() {
    return this.props.companyId
  }

  get workspaceId() {
    return this.props.workspaceId
  }

  get scenarioId() {
    return this.props.scenarioId
  }

  get sourceSnapshotId() {
    return this.props.sourceSnapshotId
  }

  get version() {
    return this.props.version
  }

  get status(): ProjectionStatus {
    return this.props.status
  }

  get organization() {
    return this.props.organization
  }

  get metrics() {
    return this.props.metrics
  }

  get warnings() {
    return this.props.warnings
  }

  get errors() {
    return this.props.errors
  }

  get manifest() {
    return this.props.manifest
  }

  get createdAt() {
    return new Date(
      this.props.createdAt.getTime()
    )
  }

  get updatedAt() {
    return new Date(
      this.props.updatedAt.getTime()
    )
  }

  toContract(): ProjectionContract {
    return Object.freeze({
      ...this.props,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    })
  }
}
