export type ExecutiveContext = Readonly<{
  companyId: string
  workspaceId: string | null
  scenarioId: string | null
  generatedAt: string
}>

export type ExecutiveContextResolution = Readonly<{
  context: ExecutiveContext
  warnings: readonly ExecutiveContextWarning[]
}>

export type ExecutiveContextWarningCode =
  | "workspace_unavailable"
  | "scenario_unavailable"
  | "workspace_read_failed"
  | "scenario_read_failed"

export type ExecutiveContextWarning = Readonly<{
  code: ExecutiveContextWarningCode
  message: string
}>
