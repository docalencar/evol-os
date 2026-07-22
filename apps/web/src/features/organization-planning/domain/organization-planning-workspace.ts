import type { Workspace } from "../types/planning-contracts"
import { assertPlanningDomain } from "./planning-domain-error"
import { requireDate, requireText, requireVersion } from "./planning-domain-support"

type CreateWorkspaceInput = {
  id: string
  companyId: string
  createdAt: Date
}

export class OrganizationPlanningWorkspace {
  private constructor(private readonly props: Workspace) {}

  static create(input: CreateWorkspaceInput) {
    const createdAt = requireDate(input.createdAt, "createdAt")

    return new OrganizationPlanningWorkspace(
      Object.freeze({
        id: requireText(input.id, "workspaceId"),
        companyId: requireText(input.companyId, "companyId"),
        version: 1,
        createdAt,
        updatedAt: new Date(createdAt.getTime()),
      })
    )
  }

  static restore(input: Workspace) {
    const createdAt = requireDate(input.createdAt, "createdAt")
    const updatedAt = requireDate(input.updatedAt, "updatedAt")
    assertPlanningDomain(
      updatedAt.getTime() >= createdAt.getTime(),
      "invalid_input",
      "updatedAt não pode ser anterior a createdAt."
    )

    return new OrganizationPlanningWorkspace(
      Object.freeze({
        ...input,
        id: requireText(input.id, "workspaceId"),
        companyId: requireText(input.companyId, "companyId"),
        version: requireVersion(input.version),
        createdAt,
        updatedAt,
      })
    )
  }

  get id() { return this.props.id }
  get companyId() { return this.props.companyId }
  get version() { return this.props.version }
  get createdAt() { return new Date(this.props.createdAt.getTime()) }
  get updatedAt() { return new Date(this.props.updatedAt.getTime()) }

  toContract(): Workspace {
    return Object.freeze({
      ...this.props,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    })
  }
}
