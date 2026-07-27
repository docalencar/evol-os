"use server"


import {
  applyScenarioChangeSets,
} from "../application/services/apply-scenario-change-sets"



type Input = {

  companyId: string

  scenarioId: string

}



export async function applyApprovedScenarioAction(
  input: Input
) {


  return applyScenarioChangeSets(
    input
  )

}