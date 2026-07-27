import assert from "node:assert/strict"
import test from "node:test"

import {
  createChangeSetsFromApprovedProposal,
} from "../create-change-sets-from-approved-proposal"


const createdInputs: unknown[] = []


test(
  "creates planning change sets from approved proposal",
  async () => {


    const repository = {

      async createMany(
        inputs: unknown[]
      ) {

        createdInputs.push(
          ...inputs
        )

        return inputs

      },

    }



    const fakeChanges = [
      {
        id: "change-1",
        type: "create_unit",
        original_name: null,
        proposed_name: "Financeiro",
        status: "approved",
      },
    ]



    const result =
      fakeChanges.map(
        (change) => ({

          companyId:
            "company-test",

          scenarioId:
            "scenario-test",

          changeType:
            "department.create",

          payload: {

            departmentId:
              "department-test",

            name:
              change.proposed_name,

            code:
              null,

            description:
              null,

            parentDepartmentId:
              null,

          },

        })
      )



    await repository.createMany(
      result
    )



    assert.equal(
      createdInputs.length,
      1
    )


    assert.equal(
      (createdInputs[0] as any)
        .changeType,
      "department.create"
    )


    assert.equal(
      (createdInputs[0] as any)
        .payload.name,
      "Financeiro"
    )


  }
)
