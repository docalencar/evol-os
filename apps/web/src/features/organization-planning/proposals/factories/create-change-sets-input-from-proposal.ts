import {
  mapProposalChangeToChangeSet,
} from "../mappers/map-proposal-change-to-change-set"

import type {
  OrganizationReorganizationChange,
} from "../types/organization-reorganization-proposal"


type Input = {
  companyId: string
  scenarioId: string
  changes: readonly OrganizationReorganizationChange[]
}


export function createChangeSetsInputFromProposal(
  input: Input
) {

  return input.changes.map(
    (change) => {

      const mapped =
        mapProposalChangeToChangeSet(
          change
        )


      return {

        companyId:
          input.companyId,

        scenarioId:
          input.scenarioId,

        changeType:
          mapped.changeType,

        payload:
          mapped.payload,

      }

    }
  )

}