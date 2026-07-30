import type {
  KPIDirection,
  KPIValue,
  KPIValueKind,
} from "../types/kpi-types"

export type KPIDefinition<TInput> = Readonly<{
  id: string
  key?: string
  name: string
  description: string
  ownerModule?: string
  category?: string
  valueKind: KPIValueKind
  unit?: string | null
  precision?: number
  favorableDirection: KPIDirection
  thresholds?: readonly KPIThreshold[]
  target?: number | null
  features?: KPIFeatureFlags
  calculate(input: TInput): KPIValue
}>

export type KPIThreshold = Readonly<{
  level: "info" | "warning" | "critical"
  operator: "at-least" | "at-most"
  value: number
}>

export type KPIFeatureFlags = Readonly<{
  trend: boolean
  benchmark: boolean
  forecast: boolean
  sla: boolean
}>
