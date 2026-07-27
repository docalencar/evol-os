import type {
  SupabaseClient,
} from "@supabase/supabase-js"


export function createOrganizationProposalApprovalRepository(
  supabase: SupabaseClient
) {

  return {


    async createApproval(
      proposalId: string,
      approverId?: string | null
    ) {

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "organization_proposal_approvals"
          )
          .insert({

            proposal_id:
              proposalId,

            approver_id:
              approverId ?? null,

            status:
              "pending",

          })
          .select()
          .single()


      if (error) {
        throw error
      }


      return data

    },


    async updateApprovalDecision(
      approvalId: string,
      input: {
        status:
          | "approved"
          | "rejected"

        comment?: string | null

        approverId?: string | null
      }
    ) {


      const {
        data,
        error,
      } =
        await supabase
          .from(
            "organization_proposal_approvals"
          )
          .update({

            status:
              input.status,

            comment:
              input.comment ?? null,

            approver_id:
              input.approverId ?? null,

            approved_at:
              new Date().toISOString(),

            updated_at:
              new Date().toISOString(),

          })
          .eq(
            "id",
            approvalId
          )
          .select()
          .single()


      if (error) {
        throw error
      }


      return data

    },


  }

}
