import type { KPIDefinition } from "../contracts/kpi-definition"

export type KPIDefinitionVersion = Readonly<{
  definitionId: string
  key: string
  version: number
  effectiveFrom: Date
  effectiveUntil?: Date | null
  active: boolean
  definition: KPIDefinition<unknown>
}>
