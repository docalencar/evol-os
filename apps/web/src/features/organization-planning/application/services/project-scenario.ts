import {
  ProjectionEngine,
} from "@/features/organization-planning/projection/engine"

import {
  DepartmentExecutor,
  TeamExecutor,
  EmployeeExecutor,
  PositionExecutor,
} from "@/features/organization-planning/projection/executors"

import type {
  PlanningScenarioContract,
  PublishedSnapshotContract,
  ChangeSet,
} from "@/features/organization-planning/types/planning-contracts"



type Input = {
  scenario: PlanningScenarioContract
  snapshot: PublishedSnapshotContract
  changeSets: readonly ChangeSet[]
}



export async function projectScenario(
  input: Input
) {

  const engine =
    ProjectionEngine.create([
      new DepartmentExecutor(),
      new TeamExecutor(),
      new EmployeeExecutor(),
      new PositionExecutor(),
    ])


  return engine.project({

    snapshot:
      input.snapshot,

    scenario:
      input.scenario,

    changeSets:
      input.changeSets,

  })

}