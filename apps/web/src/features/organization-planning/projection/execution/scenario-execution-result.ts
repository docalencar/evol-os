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
