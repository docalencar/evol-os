import {
  getPlanningChangeSets,
} from "../../change-sets/queries"

import {
  createScenarioComparison,
} from "./create-scenario-comparison"

import type {
  ScenarioComparison,
} from "../types/scenario-comparison"


export type GetScenarioComparisonInput =
  Readonly<{
    companyId: string
    scenarioId: string
  }>


export async function getScenarioComparison(
  input: GetScenarioComparisonInput
): Promise<ScenarioComparison> {
  const changeSets =
    await getPlanningChangeSets({
      companyId: input.companyId,
      scenarioId: input.scenarioId,
    })

  return createScenarioComparison(
    input.scenarioId,
    changeSets
  )
}
