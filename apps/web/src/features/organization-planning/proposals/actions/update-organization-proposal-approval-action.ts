"use server"

import {
  createServerDatabase,
} from "@/lib/database/server-database"


import {
  createOrganizationProposalApprovalRepository,
} from "../approvals/repositories/organization-proposal-approval-repository"


import {
  createScenarioFromApprovedProposal,
} from "../services/create-scenario-from-approved-proposal"


import {
  createChangeSetsFromApprovedProposal,
} from "../services/create-change-sets-from-approved-proposal"



type Input = {

  approvalId: string

  proposalId: string

  decision:
    | "approved"
    | "rejected"

  comment?: string | null

}



export async function updateOrganizationProposalApprovalAction(
  input: Input
) {


  const supabase =
    await createServerDatabase()



  const approvalRepository =
    createOrganizationProposalApprovalRepository(
      supabase
    )



  const approval =
    await approvalRepository.updateApprovalDecision(
      input.approvalId,
      {
        status:
          input.decision,

        comment:
          input.comment,

      }
    )



  const {
    error,
  } =
    await supabase
      .from(
        "organization_reorganization_proposals"
      )
      .update({

        status:
          input.decision,

        updated_at:
          new Date().toISOString(),

      })
      .eq(
        "id",
        input.proposalId
      )


  if (error) {
    throw error
  }



  if (
    input.decision === "approved"
  ) {


    const {
      data: proposal,
      error: proposalError,
    } =
      await supabase
        .from(
          "organization_reorganization_proposals"
        )
        .select(
          `
          id,
          company_id,
          title,
          description
          `
        )
        .eq(
          "id",
          input.proposalId
        )
        .single()



    if (proposalError) {
      throw proposalError
    }



    const {
      scenario,
    } =
      await createScenarioFromApprovedProposal({

        companyId:
          proposal.company_id,


        proposal: {

          id:
            proposal.id,

          title:
            proposal.title,

          description:
            proposal.description,

        },

      })



    await createChangeSetsFromApprovedProposal({

      proposalId:
        proposal.id,


      companyId:
        proposal.company_id,


      scenarioId:
        scenario.id,

    })

  }



  return approval

}