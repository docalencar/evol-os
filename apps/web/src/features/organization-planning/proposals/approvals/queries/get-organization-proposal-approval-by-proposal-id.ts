import {
  createServerDatabase,
} from "@/lib/database/server-database"


export async function getOrganizationProposalApprovalByProposalId(
  proposalId: string
) {

  const supabase =
    await createServerDatabase()


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "organization_proposal_approvals"
      )
      .select(
        `
          id,
          proposal_id,
          approver_id,
          status,
          comment,
          approved_at,
          created_at,
          updated_at
        `
      )
      .eq(
        "proposal_id",
        proposalId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle()


  if (error) {
    throw error
  }


  return data

}
