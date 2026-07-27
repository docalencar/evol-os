import assert from "node:assert/strict"
import test from "node:test"

import {
  compareOrganizations,
} from "../services/compare-organizations"



test(
  "compares current and projected organizations",
  () => {

    const result =
      compareOrganizations(

        {
          departments: [
            {
              id: "department-1",
            },
          ],

          teams: [],

          positions: [],

          employees: [],
        },


        {
          departments: [
            {
              id: "department-1",
            },

            {
              id: "department-2",
            },
          ],

          teams: [],

          positions: [],

          employees: [],
        }

      )


    assert.equal(
      result.departments.created,
      1
    )


    assert.equal(
      result.departments.removed,
      0
    )


    assert.equal(
      result.totalChanges,
      1
    )

  }
)
