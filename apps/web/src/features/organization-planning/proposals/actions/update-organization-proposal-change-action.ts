"use server"

import {
  createServerDatabase,
} from "@/lib/database/server-database"

import {
  createOrganizationReorganizationProposalRepository,
} from "../repositories/organization-reorganization-proposal-repository"

import {
  updateProposalStatusFromChanges,
} from "../services/update-proposal-status-from-changes"


type Input = {
  changeId: string

  proposalId: string

  proposedName: string

  status:
    | "suggested"
    | "accepted"
    | "modified"
    | "removed"
}


export async function updateOrganizationProposalChangeAction(
  input: Input
) {

  console.log(
    "ACTION UPDATE CHANGE INPUT",
    input
  )


  const supabase =
    await createServerDatabase()


  const repository =
    createOrganizationReorganizationProposalRepository(
      supabase
    )


  const result =
    await repository.updateChange(
      input.changeId,
      {
        proposedName:
          input.proposedName,

        status:
          input.status,
      }
    )


  await updateProposalStatusFromChanges(
    supabase,
    input.proposalId
  )


  return result
}