export const SCENARIO_INSIGHT_SEVERITIES = [
  "info",
  "warning",
  "critical",
] as const

export type ScenarioInsightSeverity =
  (typeof SCENARIO_INSIGHT_SEVERITIES)[number]


export type ScenarioInsight = Readonly<{
  type: string
  severity: ScenarioInsightSeverity
  title: string
  description: string
}>
