export type ExecutiveContextProviderResult = Readonly<{
  companyId: string
  workspaceId: string | null
  scenarioId: string | null
}>

export interface ExecutiveContextProvider {
  load(): Promise<ExecutiveContextProviderResult>
}
