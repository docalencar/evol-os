export type ExecutiveContextProviderResult = Readonly<{
  companyId: string
  workspaceId: string | null
  scenarioId: string | null
  failures?: readonly ("workspace_read_failed" | "scenario_read_failed")[]
}>

export interface ExecutiveContextProvider {
  load(): Promise<ExecutiveContextProviderResult>
}
