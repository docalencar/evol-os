"use server"

import {
  createServerDatabase,
} from "@/lib/database/server-database"

import {
  createOrganizationReorganizationProposal,
} from "../services/create-organization-reorganization-proposal"

import {
  createOrganizationReorganizationProposalRepository,
} from "../repositories/organization-reorganization-proposal-repository"

import type {
  OrganizationReorganizationProposal,
} from "../types/organization-reorganization-proposal"


type Input = {
  companyId: string

  suggestedUnits: string[]

  createdBy?: string | null
}


export async function createOrganizationProposalAction(
  input: Input
): Promise<OrganizationReorganizationProposal> {


  const proposal =
    createOrganizationReorganizationProposal({
      suggestedUnits:
        input.suggestedUnits,
    })


  const supabase =
    await createServerDatabase()


  const repository =
    createOrganizationReorganizationProposalRepository(
      supabase
    )


  const savedProposal =
    await repository.createProposal({
      companyId:
        input.companyId,

      title:
        proposal.title,

      description:
        proposal.description,

      createdBy:
        input.createdBy ?? null,
    })


  await repository.createChanges(
    proposal.changes.map(
      (change) => ({

        proposalId:
          savedProposal.id,

        type:
          change.type,

        originalName:
          change.originalName,

        proposedName:
          change.proposedName,

        status:
          change.status,

      })
    )
  )


  return {

    id:
      savedProposal.id,


    status:
      savedProposal.status,


    title:
      savedProposal.title,


    description:
      savedProposal.description,


    changes:
      proposal.changes.map(
        (change) => ({

          id:
            crypto.randomUUID(),

          type:
            change.type,

          originalName:
            change.originalName,

          proposedName:
            change.proposedName,

          status:
            change.status,

        })
      ),


    createdAt:
      savedProposal.created_at,

  }

}
