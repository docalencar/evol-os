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

export type ExecutiveContextWarning = Readonly<{
  code: ExecutiveContextWarningCode
  message: string
}>