export type OrganizationProposalApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"


export type OrganizationProposalApproval = {

  id: string

  proposalId: string

  approverId:
    string | null

  status:
    OrganizationProposalApprovalStatus

  comment:
    string | null

  approvedAt:
    string | null

  createdAt:
    string

  updatedAt:
    string
}
