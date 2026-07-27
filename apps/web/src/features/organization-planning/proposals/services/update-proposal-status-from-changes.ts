import type {
  SupabaseClient,
} from "@supabase/supabase-js"


export async function updateProposalStatusFromChanges(
  supabase: SupabaseClient,
  proposalId: string
) {

  const {
    data: changes,
    error,
  } =
    await supabase
      .from(
        "organization_reorganization_changes"
      )
      .select(
        "status"
      )
      .eq(
        "proposal_id",
        proposalId
      )


  if (error) {
    throw error
  }


  const hasPending =
    changes.some(
      (change) =>
        change.status === "suggested"
    )


  await supabase
    .from(
      "organization_reorganization_proposals"
    )
    .update({
      status:
        hasPending
          ? "review"
          : "ready_for_approval",

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      proposalId
    )

}
