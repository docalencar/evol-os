import assert from "node:assert/strict"
import test from "node:test"

import {
  createScenarioComparison,
} from "../create-scenario-comparison"

import type {
  PlanningChangeSet,
} from "../../../change-sets/types/planning-change-set"



test(
  "creates scenario comparison summary from change sets",
  () => {

    const changeSets:
      readonly PlanningChangeSet[] =
    [

      {
        id:
          "change-1",

        companyId:
          "company-1",

        scenarioId:
          "scenario-1",

        version:
          1,

        changeType:
          "department.create",

        payload:
        {
          departmentId:
            "department-1",

          name:
            "Financeiro",
        },

      },


      {
        id:
          "change-2",

        companyId:
          "company-1",

        scenarioId:
          "scenario-1",

        version:
          2,

        changeType:
          "team.create",

        payload:
        {
          teamId:
            "team-1",

          name:
            "Contabilidade",
        },

      },

    ]


    const result =
      createScenarioComparison(
        "scenario-1",
        changeSets
      )


    assert.equal(
      result.scenarioId,
      "scenario-1"
    )


    assert.equal(
      result.summary.departmentsCreated,
      1
    )


    assert.equal(
      result.summary.teamsCreated,
      1
    )


    assert.equal(
      result.summary.departmentsArchived,
      0
    )

  }
)
