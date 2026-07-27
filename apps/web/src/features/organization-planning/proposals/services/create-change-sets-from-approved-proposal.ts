import "server-only"

import {
  createServerDatabase,
} from "@/lib/database/server-database"

import {
  createPlanningChangeSetRepository,
} from "@/features/organization-planning/change-sets/repositories/planning-change-set-repository"

import {
  createChangeSetsInputFromProposal,
} from "../factories/create-change-sets-input-from-proposal"


type Input = {
  proposalId: string
  companyId: string
  scenarioId: string
}


export async function createChangeSetsFromApprovedProposal(
  input: Input
) {

  const database =
    await createServerDatabase()


  const repository =
    await createPlanningChangeSetRepository()



  const {
    data: changes,
    error,
  } =
    await database
      .from(
        "organization_reorganization_changes"
      )
      .select(
        `
        id,
        type,
        original_name,
        proposed_name,
        status
        `
      )
      .eq(
        "proposal_id",
        input.proposalId
      )


  if (error) {
    throw error
  }


  if (
    !changes ||
    changes.length === 0
  ) {
    return []
  }



  const changeSetInputs =
    createChangeSetsInputFromProposal({

      companyId:
        input.companyId,

      scenarioId:
        input.scenarioId,

      changes:
        changes.map(
          (change) => ({

            id:
              change.id,

            type:
              change.type,

            originalName:
              change.original_name,

            proposedName:
              change.proposed_name,

            status:
              change.status,

          })
        ),

    })



  return repository.createMany(
    changeSetInputs
  )

}