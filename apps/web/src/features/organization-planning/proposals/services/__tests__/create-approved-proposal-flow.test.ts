import assert from "node:assert/strict"
import test from "node:test"

import {
  PlanningScenario,
} from "../../../domain/planning-scenario.ts"

import {
  PublishedSnapshot,
} from "../../../domain/published-snapshot.ts"


const companyId =
  "company-test"

const workspaceId =
  "workspace-test"

const snapshotId =
  "snapshot-test"


test(
  "approved proposal flow creates scenario base entities",
  () => {

    const scenario =
      PlanningScenario.create({

        id:
          "scenario-test",

        companyId,

        workspaceId,

        baseSnapshotId:
          snapshotId,

        name:
          "Reorganização 2027",

        description:
          "Cenário criado através de aprovação",

        createdAt:
          new Date(
            "2026-07-27T10:00:00.000Z"
          ),

      })


    const scenarioContract =
      scenario.toContract()


    assert.equal(
      scenarioContract.companyId,
      companyId
    )


    const snapshot =
      PublishedSnapshot.restore({

        id:
          "snapshot-test-2",

        companyId,

        workspaceId,

        sourceScenarioId:
          scenarioContract.id,

        version:
          2,

        publishedAt:
          new Date(
            "2026-07-27T10:01:00.000Z"
          ),

      })


    assert.equal(
      snapshot.toContract().sourceScenarioId,
      scenarioContract.id
    )


    assert.equal(
      snapshot.toContract().version,
      2
    )

  }
)
