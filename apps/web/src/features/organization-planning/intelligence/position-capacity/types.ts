export type PositionCapacityRisk =
  | "healthy"
  | "attention"
  | "critical"


export type PositionCapacityAnalysis = Readonly<{
  positionId: string
  positionName: string
  occupants: number
  risk: PositionCapacityRisk
  message: string
}>


export type PositionCapacityResult = Readonly<{
  positions: readonly PositionCapacityAnalysis[]
  totalPositions: number
  vacantPositions: number
  attentionCount: number
  criticalCount: number
}>
