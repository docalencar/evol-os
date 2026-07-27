import type {
  OrganizationReorganizationProposal,
} from "../types/organization-reorganization-proposal"


export function calculateOrganizationProposalStatus(
  proposal: OrganizationReorganizationProposal
) {

  const hasPending =
    proposal.changes.some(
      (change) =>
        change.status === "suggested"
    )


  if (hasPending) {

    return {
      status: "review",
      label: "Em revisão",
    }

  }


  return {
    status: "ready_for_approval",
    label: "Pronta para aprovação",
  }

}