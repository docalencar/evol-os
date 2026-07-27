import type {
  OrganizationReorganizationProposal,
} from "../types/organization-reorganization-proposal"


type ProposalChangeDatabase = {

  id: string

  type:
    | "create_unit"
    | "update_unit"
    | "remove_unit"

  original_name: string

  proposed_name: string

  status:
    | "suggested"
    | "accepted"
    | "modified"
    | "removed"

}


type OrganizationProposalDatabase = {

  id: string

  status:
    | "draft"
    | "review"
    | "ready_for_approval"
    | "pending_approval"
    | "approved"
    | "rejected"
    | "applied"

  title: string

  description: string | null

  created_at: string

  changes?: ProposalChangeDatabase[]

}


export function presentOrganizationProposal(
  proposal: OrganizationProposalDatabase
): OrganizationReorganizationProposal {


  return {

    id:
      proposal.id,


    status:
      proposal.status,


    title:
      proposal.title,


    description:
      proposal.description ?? "",


    changes:
      proposal.changes?.map(
        (change) => ({

          id:
            change.id,

          type:
            change.type,

          originalName:
            change.original_name,

          proposedName:
            change.proposed_name,

          status:
            change.status,

        })
      ) ?? [],


    createdAt:
      proposal.created_at,

  }

}
