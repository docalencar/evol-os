export interface ContextProvider {
  provide(): Promise<string | null> | string | null
}
