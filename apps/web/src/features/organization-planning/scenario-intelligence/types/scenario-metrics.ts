export type ScenarioMetricCategory =
  | "structural"
  | "financial"
  | "capacity"
  | "risk"

export type ScenarioMetric = Readonly<{
  key: string
  label: string
  value: number
  unit: string | null
  category: ScenarioMetricCategory
}>

export type ScenarioMetrics = Readonly<{
  items: readonly ScenarioMetric[]
}>
