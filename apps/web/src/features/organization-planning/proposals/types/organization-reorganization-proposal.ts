export type OrganizationProposalStatus =
  | "draft"
  | "review"
  | "ready_for_approval"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "applied"


export type OrganizationReorganizationChangeStatus =
  | "suggested"
  | "accepted"
  | "modified"
  | "removed"


export type OrganizationReorganizationChange = {
  id: string

  type:
    | "create_unit"
    | "update_unit"
    | "remove_unit"

  originalName: string

  proposedName: string

  status: OrganizationReorganizationChangeStatus
}


export type OrganizationReorganizationProposal = {
  id: string

  status: OrganizationProposalStatus

  title: string

  description: string

  changes: OrganizationReorganizationChange[]

  createdAt: string
}
