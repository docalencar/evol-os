import type {
  OrganizationReorganizationChange,
} from "../types/organization-reorganization-proposal"


import { randomUUID } from "crypto"


type MappedChangeSet = {
  changeType:
    | "department.create"
    | "department.update"
    | "department.archive"

  payload:
    Record<string, unknown>
}


export function mapProposalChangeToChangeSet(
  change: OrganizationReorganizationChange
): MappedChangeSet {


  switch (change.type) {


    case "create_unit":

      return {

        changeType:
          "department.create",

        payload: {

          departmentId:
            randomUUID(),

          name:
            change.proposedName,

          code:
            null,

          description:
            null,

          parentDepartmentId:
            null,

        },

      }



    case "update_unit":

      return {

        changeType:
          "department.update",

        payload: {

          departmentId:
            change.id,

          name:
            change.proposedName,

        },

      }



    case "remove_unit":

      return {

        changeType:
          "department.archive",

        payload: {

          departmentId:
            change.id,

        },

      }



    default:

      throw new Error(
        `Unsupported proposal change type: ${change.type}`
      )

  }

}