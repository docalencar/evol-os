import type {
  CreatePlanningChangeSetCommand,
} from "../commands"
import {
  createPlanningChangeSetCommandSchema,
} from "../commands/planning-command-schemas"
import type {
  PlanningChangeSetApplicationRepository,
  ScenarioApplicationRepository,
} from "../ports"
import type {
  PlanningUnitOfWork,
} from "../transactions"
import {
  assertApplicationRelation,
  executeInUnitOfWork,
  requireApplicationEntity,
} from "./planning-handler-support"

export class CreatePlanningChangeSetHandler {
  constructor(
    private readonly scenarios:
      ScenarioApplicationRepository,
    private readonly changeSets:
      PlanningChangeSetApplicationRepository,
    private readonly unitOfWork:
      PlanningUnitOfWork
  ) {}

  async execute(
    command: CreatePlanningChangeSetCommand
  ) {
    createPlanningChangeSetCommandSchema.parse(
      command
    )

    return executeInUnitOfWork(
      this.unitOfWork,
      async () => {
        const scenario =
          await this.scenarios.findById(
            command.companyId,
            command.scenarioId
          )

        const existingScenario =
          requireApplicationEntity(
            scenario,
            "Cenário não encontrado."
          )

        assertApplicationRelation(
          existingScenario.status === "draft",
          "Apenas cenários em rascunho podem receber alterações."
        )

        return this.changeSets.create({
          id: command.changeSetId,
          companyId: command.companyId,
          scenarioId: command.scenarioId,
          changeType: command.changeType,
          payload: command.payload,
        })
      }
    )
  }
}
