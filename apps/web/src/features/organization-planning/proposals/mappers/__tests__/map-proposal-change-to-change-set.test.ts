import assert from "node:assert/strict"
import test from "node:test"

import {
  mapProposalChangeToChangeSet,
} from "../map-proposal-change-to-change-set"


test(
  "maps create unit proposal change into department create change set",
  () => {

    const result =
      mapProposalChangeToChangeSet({

        id:
          "change-1",

        type:
          "create_unit",

        originalName:
          "",

        proposedName:
          "Financeiro",

        status:
          "suggested",

      })


    assert.equal(
      result.changeType,
      "department.create"
    )


    assert.equal(
      result.payload.name,
      "Financeiro"
    )


    assert.ok(
      result.payload.departmentId
    )


    assert.equal(
      result.payload.parentDepartmentId,
      null
    )

  }
)


test(
  "maps update unit proposal change into department update change set",
  () => {

    const result =
      mapProposalChangeToChangeSet({

        id:
          "department-1",

        type:
          "update_unit",

        originalName:
          "RH",

        proposedName:
          "Pessoas",

        status:
          "suggested",

      })


    assert.equal(
      result.changeType,
      "department.update"
    )


    assert.equal(
      result.payload.departmentId,
      "department-1"
    )


    assert.equal(
      result.payload.name,
      "Pessoas"
    )

  }
)


test(
  "maps remove unit proposal change into department archive change set",
  () => {

    const result =
      mapProposalChangeToChangeSet({

        id:
          "department-2",

        type:
          "remove_unit",

        originalName:
          "Antigo",

        proposedName:
          "Antigo",

        status:
          "suggested",

      })


    assert.equal(
      result.changeType,
      "department.archive"
    )


    assert.equal(
      result.payload.departmentId,
      "department-2"
    )

  }
)
