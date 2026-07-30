import type {
  KPIDirection,
  KPIValue,
  KPIValueKind,
} from "../types/kpi-types"

export type KPIDefinition<TInput> = Readonly<{
  id: string
  name: string
  description: string
  valueKind: KPIValueKind
  unit?: string | null
  precision?: number
  favorableDirection: KPIDirection
  calculate(input: TInput): KPIValue
}>
