import assert from "node:assert/strict"
import test from "node:test"

import {
  projectScenario,
} from "../project-scenario"

import type {
  PlanningScenarioContract,
  PublishedSnapshotContract,
  ChangeSet,
} from "@/features/organization-planning/types/planning-contracts"



const scenario:
  PlanningScenarioContract =
{
  id: "scenario-1",

  companyId:
    "company-1",

  workspaceId:
    "workspace-1",

  baseSnapshotId:
    "snapshot-1",

  name:
    "Reorganização 2027",

  description:
    "Cenário futuro",

  status:
    "draft",

  version:
    1,

  createdAt:
    new Date(),

  updatedAt:
    new Date(),
}



const snapshot:
  PublishedSnapshotContract =
{
  id:
    "snapshot-1",

  companyId:
    "company-1",

  workspaceId:
    "workspace-1",

  sourceScenarioId:
    null,

  version:
    1,

  publishedAt:
    new Date(),
}



const changeSets:
  readonly ChangeSet[] =
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

      code:
        null,

      description:
        null,

      parentDepartmentId:
        null,
    },
  },
]



test(
  "projects scenario and applies department creation",
  async () => {

    const result =
      await projectScenario({

        scenario,

        snapshot,

        changeSets,

      })


    assert.equal(
      result.organization.departments.length,
      1
    )


    assert.equal(
      result.organization.departments[0]?.name,
      "Financeiro"
    )


    assert.ok(
      result
    )

  }
)
