import assert from "node:assert/strict"
import test from "node:test"


type Proposal = {
  id: string
  companyId: string
  title: string
  description: string | null
}


type Scenario = {
  id: string
  companyId: string
}


type ChangeSet = {
  changeType: string
  payload: Record<string, unknown>
}



async function simulateApprovalFlow(
  proposal: Proposal
) {

  const scenario: Scenario = {
    id: "scenario-created",
    companyId:
      proposal.companyId,
  }


  const changeSets: ChangeSet[] = [
    {
      changeType:
        "department.create",

      payload: {
        name:
          "Novo Departamento",
      },
    },
  ]


  return {
    proposalStatus:
      "approved",

    scenario,

    changeSets,
  }

}



test(
  "approved proposal creates scenario and change sets",
  async () => {

    const result =
      await simulateApprovalFlow({

        id:
          "proposal-1",

        companyId:
          "company-1",

        title:
          "Reorganização",

        description:
          "Teste",

      })


    assert.equal(
      result.proposalStatus,
      "approved"
    )


    assert.equal(
      result.scenario.companyId,
      "company-1"
    )


    assert.equal(
      result.changeSets.length,
      1
    )


    assert.equal(
      result.changeSets[0].changeType,
      "department.create"
    )


    assert.equal(
      result.changeSets[0].payload.name,
      "Novo Departamento"
    )

  }
)
