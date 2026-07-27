import assert from "node:assert/strict"
import test from "node:test"

import {
  createScenarioComparison,
} from "../create-scenario-comparison"

import type {
  PlanningChangeSet,
} from "../../../change-sets"



const changeSets:
  readonly PlanningChangeSet[] =
[
  {
    id: "change-1",
    companyId: "company-1",
    scenarioId: "scenario-1",
    version: 1,
    changeType: "department.create",
    payload: {
      departmentId: "department-1",
      name: "Financeiro",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]


test(
  "creates scenario comparison summary from scenario change sets",
  () => {

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

  }
)
