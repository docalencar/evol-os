"use server"


import {
  createServerDatabase,
} from "@/lib/database/server-database"


import {
  createOrganizationProposalApprovalRepository,
} from "../approvals/repositories/organization-proposal-approval-repository"



type Input = {

  proposalId: string

}



export async function sendOrganizationProposalForApprovalAction(
  input: Input
) {


  const supabase =
    await createServerDatabase()







  const approvalRepository =
    createOrganizationProposalApprovalRepository(
      supabase
    )



  await supabase
    .from(
      "organization_reorganization_proposals"
    )
    .update({

      status:
        "pending_approval",

      updated_at:
        new Date().toISOString(),

    })
    .eq(
      "id",
      input.proposalId
    )



  return approvalRepository.createApproval(
    input.proposalId
  )

}
