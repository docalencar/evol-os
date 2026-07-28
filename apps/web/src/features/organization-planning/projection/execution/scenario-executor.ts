import type { ChangeSet } from "../../types/planning-contracts"
import {
  createEmptyProjectedOrganization,
  freezeProjectedOrganization,
  type ProjectionInput,
  type ProjectionIssue,
} from "../contracts"
import { orderChangeSets, ProjectionEngine } from "../engine"
import {
  createScenarioExecutionResult,
  type ScenarioExecutionResult,
} from "./scenario-execution-result"

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

    const orderedChangeSets = orderChangeSets(
      input.changeSets
    )

    const duplicateIdIssue =
      findDuplicateChangeSetIdIssue(orderedChangeSets)

    if (duplicateIdIssue) {
      const finishedAt = this.clock()
      const organization = createEmptyProjectedOrganization()

      return createScenarioExecutionResult({
        organization,
        metrics: organization.metrics,
        issues: Object.freeze([duplicateIdIssue]),
        warnings: Object.freeze([]),
        executedChangeSets: Object.freeze([]),
        generatedAtTimestamp: startedAt,
        duration: finishedAt - startedAt,
      })
    }

    const projection = this.engine.project({
      snapshot: input.snapshot,
      scenario: input.scenario,
      changeSets: orderedChangeSets,
    })

    const executedChangeSetIds = new Set(
      projection.events
        .filter(
          (event) => event.type === "change-set.executed"
        )
        .map((event) => event.changeSetId)
    )
    const executedChangeSets = Object.freeze(
      orderedChangeSets
        .filter((changeSet) =>
          executedChangeSetIds.has(changeSet.id)
        )
        .map(freezeChangeSet)
    )

    const organization = freezeProjectedOrganization(
      projection.organization
    )
    const issues = freezeIssues(projection.errors)
    const warnings = freezeIssues(projection.warnings)

    const finishedAt = this.clock()

    return createScenarioExecutionResult({
      organization,
      metrics: organization.metrics,
      issues,
      warnings,
      executedChangeSets,
      generatedAtTimestamp: startedAt,
      duration: finishedAt - startedAt,
    })
  }
}

function findDuplicateChangeSetIdIssue(
  changeSets: readonly ChangeSet[]
): ProjectionIssue | null {
  const occurrences = new Map<string, number>()

  for (const changeSet of changeSets) {
    occurrences.set(
      changeSet.id,
      (occurrences.get(changeSet.id) ?? 0) + 1
    )
  }

  const duplicateIds = [...occurrences.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort((left, right) => left.localeCompare(right))

  if (duplicateIds.length === 0) {
    return null
  }

  return Object.freeze({
    code: "scenario.execution.duplicate_change_set_id",
    message: `A execução possui IDs de change set duplicados: ${duplicateIds.join(", ")}.`,
  })
}

function freezeChangeSet(changeSet: ChangeSet): ChangeSet {
  return Object.freeze({
    ...changeSet,
    payload: freezePayload(changeSet.payload),
  })
}

function freezePayload(
  payload: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
  return freezeValue(payload) as Readonly<Record<string, unknown>>
}

function freezeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeValue))
  }

  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, current]) => [
          key,
          freezeValue(current),
        ])
      )
    )
  }

  return value
}

function freezeIssues(
  issues: readonly ProjectionIssue[]
): readonly ProjectionIssue[] {
  return Object.freeze(
    issues.map((issue) => Object.freeze({ ...issue }))
  )
}
