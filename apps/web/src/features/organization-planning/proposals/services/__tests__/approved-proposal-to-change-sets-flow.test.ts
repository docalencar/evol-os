import assert from "node:assert/strict"
import test from "node:test"

import {
  mapProposalChangeToChangeSet,
} from "../../mappers/map-proposal-change-to-change-set"

import type {
  OrganizationReorganizationChange,
} from "../../types/organization-reorganization-proposal"


const companyId = "company-test"

const scenarioId = "scenario-test"


const proposalChanges:
  OrganizationReorganizationChange[] =
[
  {
    id: "change-1",
    type: "create_unit",
    proposedName: "Novo Departamento",
    originalName: null,
    status: "approved",
  },

  {
    id: "change-2",
    type: "update_unit",
    proposedName: "Departamento Atualizado",
    originalName: "Departamento Antigo",
    status: "approved",
  },

  {
    id: "change-3",
    type: "remove_unit",
    proposedName: null,
    originalName: "Departamento Removido",
    status: "approved",
  },
]


test(
  "approved proposal changes generate valid planning change sets",
  () => {

    const changeSets =
      proposalChanges.map(
        (change) => {

          const mapped =
            mapProposalChangeToChangeSet(
              change
            )


          return {

            companyId,

            scenarioId,

            changeType:
              mapped.changeType,

            payload:
              mapped.payload,

          }

        }
      )


    assert.equal(
      changeSets.length,
      3
    )


    assert.equal(
      changeSets[0].changeType,
      "department.create"
    )


    assert.equal(
      changeSets[1].changeType,
      "department.update"
    )


    assert.equal(
      changeSets[2].changeType,
      "department.archive"
    )


    assert.equal(
      changeSets[0].payload.name,
      "Novo Departamento"
    )


    assert.equal(
      changeSets[1].payload.name,
      "Departamento Atualizado"
    )


    assert.equal(
      changeSets[2].payload.departmentId,
      "change-3"
    )

  }
)
