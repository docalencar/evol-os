import type {
  SupabaseClient,
} from "@supabase/supabase-js"


type CreateProposalInput = {
  companyId: string
  title: string
  description: string
  createdBy?: string | null
}


type CreateChangeInput = {
  proposalId: string
  type: "create_unit" | "update_unit" | "remove_unit"
  originalName: string
  proposedName: string
  status:
    | "suggested"
    | "accepted"
    | "modified"
    | "removed"
}


export function createOrganizationReorganizationProposalRepository(
  supabase: SupabaseClient
) {

  return {

    async createProposal(
      input: CreateProposalInput
    ) {

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "organization_reorganization_proposals"
          )
          .insert({
            company_id: input.companyId,
            title: input.title,
            description: input.description,
            created_by: input.createdBy ?? null,
          })
          .select()
          .single()


      if (error) {
        throw error
      }


      return data

    },


    async createChanges(
      changes: CreateChangeInput[]
    ) {

      const {
        error,
      } =
        await supabase
          .from(
            "organization_reorganization_changes"
          )
          .insert(
            changes.map(
              (change) => ({
                proposal_id:
                  change.proposalId,

                type:
                  change.type,

                original_name:
                  change.originalName,

                proposed_name:
                  change.proposedName,

                status:
                  change.status,
              })
            )
          )


      if (error) {
        throw error
      }


      return true
    },


    async findById(
      proposalId: string
    ) {

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "organization_reorganization_proposals"
          )
          .select(
            `
              *,
              changes:
                organization_reorganization_changes(*)
            `
          )
          .eq(
            "id",
            proposalId
          )
          .single()


      if (error) {
        throw error
      }


      return data

    },

    

    async updateChange(
      changeId: string,
      input: {
        proposedName: string
        status:
          | "suggested"
          | "accepted"
          | "modified"
          | "removed"
      }
    ) {

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "organization_reorganization_changes"
          )
          .update({
            proposed_name:
              input.proposedName,

            status:
              input.status,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            changeId
          )
          .select("id")
          .maybeSingle()


      if (error) {
        throw error
      }


      if (!data) {
        throw new Error(
          "Alteração da proposta não encontrada para atualização."
        )
      }


      return data
    },


    async updateChangeStatus(
      changeId: string,
      status:
        | "suggested"
        | "accepted"
        | "modified"
        | "removed"
    ) {

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "organization_reorganization_changes"
          )
          .update({
            status,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            changeId
          )
          .select("id")
          .maybeSingle()


      if (error) {
        throw error
      }


      if (!data) {
        throw new Error(
          "Alteração da proposta não encontrada para atualização de status."
        )
      }


      return data
    },

  }

}
