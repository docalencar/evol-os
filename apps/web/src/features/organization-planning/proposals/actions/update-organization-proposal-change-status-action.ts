"use server"

import {
  createServerDatabase,
} from "@/lib/database/server-database"

import {
  createOrganizationReorganizationProposalRepository,
} from "../repositories/organization-reorganization-proposal-repository"


type Input = {
  changeId: string

  status:
    | "suggested"
    | "accepted"
    | "modified"
    | "removed"
}


export async function updateOrganizationProposalChangeStatusAction(
  input: Input
) {

  const supabase =
    await createServerDatabase()


  const repository =
    createOrganizationReorganizationProposalRepository(
      supabase
    )


  return repository.updateChangeStatus(
    input.changeId,
    input.status
  )
}
