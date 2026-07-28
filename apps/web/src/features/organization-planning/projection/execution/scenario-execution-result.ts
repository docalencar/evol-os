import type { ChangeSet } from "../../types/planning-contracts"
import type {
  ProjectedOrganization,
  ProjectionIssue,
  ProjectionMetrics,
} from "../contracts"

// Contrato serializável do resultado de uma execução de cenário. Reúne o estado
// projetado, as métricas, os problemas/avisos e metadados de execução. É produzido
// exclusivamente pelo ScenarioExecutor.
export type ScenarioExecutionResult = Readonly<{
  organization: ProjectedOrganization
  metrics: ProjectionMetrics
  issues: readonly ProjectionIssue[]
  warnings: readonly ProjectionIssue[]
  executedChangeSets: readonly ChangeSet[]
  generatedAt: Date
  duration: number
}>

type ScenarioExecutionResultInput = Omit<
  ScenarioExecutionResult,
  "generatedAt"
> & Readonly<{
  generatedAtTimestamp: number
}>

export function createScenarioExecutionResult(
  input: ScenarioExecutionResultInput
): ScenarioExecutionResult {
  const generatedAtTimestamp = input.generatedAtTimestamp

  return Object.freeze({
    organization: input.organization,
    metrics: input.metrics,
    issues: input.issues,
    warnings: input.warnings,
    executedChangeSets: input.executedChangeSets,
    get generatedAt() {
      return new Date(generatedAtTimestamp)
    },
    duration: input.duration,
  })
}
