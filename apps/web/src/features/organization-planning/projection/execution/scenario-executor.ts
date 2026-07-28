import type { ProjectionInput } from "../contracts"
import { orderChangeSets, ProjectionEngine } from "../engine"
import type { ScenarioExecutionResult } from "./scenario-execution-result"

// Fonte de tempo injetável (epoch em milissegundos). Permite execuções
// determinísticas em teste sem acoplar o executor ao relógio do sistema.
export type ExecutionClock = () => number

// Entrada de uma execução de cenário: snapshot base, cenário e seus change sets.
// Reutiliza o contrato de entrada do ProjectionEngine.
export type ScenarioExecutionInput = ProjectionInput

// Camada de execução de cenários. Orquestra o fluxo
// Snapshot → Ordenação → Projection Engine → Métricas → ScenarioExecutionResult,
// delegando a projeção e o cálculo de métricas ao ProjectionEngine já existente.
// O ProjectionEngine não ganha responsabilidades: toda a orquestração vive aqui.
export class ScenarioExecutor {
  private constructor(
    private readonly engine: ProjectionEngine,
    private readonly clock: ExecutionClock
  ) {}

  static create(
    clock: ExecutionClock = () => Date.now()
  ): ScenarioExecutor {
    return new ScenarioExecutor(
      ProjectionEngine.create(),
      clock
    )
  }

  execute(
    input: ScenarioExecutionInput
  ): ScenarioExecutionResult {
    const startedAt = this.clock()

    const executedChangeSets = orderChangeSets(
      input.changeSets
    )

    const projection = this.engine.project({
      snapshot: input.snapshot,
      scenario: input.scenario,
      changeSets: executedChangeSets,
    })

    const finishedAt = this.clock()

    return Object.freeze({
      organization: projection.organization,
      metrics: projection.metrics,
      issues: projection.errors,
      warnings: projection.warnings,
      executedChangeSets,
      generatedAt: new Date(startedAt),
      duration: finishedAt - startedAt,
    })
  }
}
