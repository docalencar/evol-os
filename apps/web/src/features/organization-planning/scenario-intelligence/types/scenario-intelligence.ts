import type { ScenarioMetrics } from "./scenario-metrics"
import type { ScenarioRecommendation } from "./scenario-recommendation"
import type { ScenarioScore } from "./scenario-score"
import type { ScenarioSummary } from "./scenario-summary"
import type { ScenarioWarning } from "./scenario-warning"

export type ScenarioIntelligenceContractVersion = "1.0.0"

export type ScenarioIntelligenceMetadata = Readonly<{
  contractVersion: ScenarioIntelligenceContractVersion
  generatedAt: string
  source: string
  scenarioId: string
}>

export type ScenarioIntelligence = Readonly<{
  summary: ScenarioSummary
  metrics: ScenarioMetrics
  score: ScenarioScore
  recommendation: ScenarioRecommendation
  warnings: readonly ScenarioWarning[]
  metadata: ScenarioIntelligenceMetadata
}>