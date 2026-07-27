import {
  createServerDatabase,
} from "@/lib/database/server-database"

import {
  createOrganizationReorganizationProposalRepository,
} from "../repositories/organization-reorganization-proposal-repository"

import {
  presentOrganizationProposal,
} from "../presenters/present-organization-proposal"

import type {
  OrganizationReorganizationProposal,
} from "../types/organization-reorganization-proposal"


export async function getOrganizationProposalById(
  proposalId: string
): Promise<OrganizationReorganizationProposal> {


  const supabase =
    await createServerDatabase()


  const repository =
    createOrganizationReorganizationProposalRepository(
      supabase
    )


  const proposal =
    await repository.findById(
      proposalId
    )


  return presentOrganizationProposal(
    proposal
  )
}