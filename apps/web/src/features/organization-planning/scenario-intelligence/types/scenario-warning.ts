export type ScenarioWarningSeverity =
  | "info"
  | "warning"
  | "critical"

export type ScenarioWarning = Readonly<{
  code: string
  message: string
  severity: ScenarioWarningSeverity
}>
