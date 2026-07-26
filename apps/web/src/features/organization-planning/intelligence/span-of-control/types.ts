export type SpanOfControlLevel =
  | "healthy"
  | "attention"
  | "critical"


export type ManagerSpanAnalysis = Readonly<{
  employeeId: string
  directReports: number
  level: SpanOfControlLevel
  message: string
}>


export type SpanOfControlResult = Readonly<{
  managers: readonly ManagerSpanAnalysis[]
  totalManagers: number
  attentionCount: number
  criticalCount: number
}>
