import assert from "node:assert/strict"
import test from "node:test"

import {
  createChangeSetsInputFromProposal,
} from "../create-change-sets-input-from-proposal"


test(
  "creates change set inputs from approved proposal changes",
  () => {

    const result =
      createChangeSetsInputFromProposal({

        companyId:
          "company-1",

        scenarioId:
          "scenario-1",

        changes: [
          {
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
          },
        ],

      })


    assert.equal(
      result.length,
      1
    )


    assert.equal(
      result[0].companyId,
      "company-1"
    )


    assert.equal(
      result[0].scenarioId,
      "scenario-1"
    )


    assert.equal(
      result[0].changeType,
      "department.create"
    )

  }
)
