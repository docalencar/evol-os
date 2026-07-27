import {
  createPlanningChangeSetRepository,
} from "@/features/organization-planning/change-sets"


import type {
  ChangeSet,
} from "@/features/organization-planning/types/planning-contracts"



type Input = {

  companyId: string

  scenarioId: string

}



export async function applyScenarioChangeSets(
  input: Input
) {


  const repository =
    await createPlanningChangeSetRepository()



  const changeSets =
    await repository.findByScenario(
      input.companyId,
      input.scenarioId
    )



  for (
    const changeSet of changeSets
  ) {

    await executeChangeSet(
      changeSet
    )

  }


  return {
    applied:
      changeSets.length,
  }

}



async function executeChangeSet(
  changeSet: ChangeSet
) {


  switch(
    changeSet.changeType
  ) {


    case "department.create":

      /*
        Próximo PR:
        criar departamento projetado
      */

      return



    case "department.update":

      return



    case "department.archive":

      return



    default:

      throw new Error(
        `Unsupported change type ${changeSet.changeType}`
      )

  }

}