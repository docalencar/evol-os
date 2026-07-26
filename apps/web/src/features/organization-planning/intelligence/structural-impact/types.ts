export type StructuralImpactMetric = Readonly<{
  current: number
  projected: number
  variation: number
}>

export type ScenarioStructuralImpact = Readonly<{
  departments: StructuralImpactMetric
  teams: StructuralImpactMetric
  positions: StructuralImpactMetric
  employees: StructuralImpactMetric
}>
